-- All security-critical game/wallet logic lives here, not in the frontend.
-- place_bet / admin_add_points / get_server_time are callable by
-- `authenticated` clients via PostgREST RPC. settle_round / tick_rounds /
-- create_next_round are NOT granted to authenticated/anon — only pg_cron
-- (running as the postgres role, which bypasses grants as a superuser) can
-- invoke them. This is what keeps dice generation and settlement out of
-- reach of the client.

-- ---------------------------------------------------------------------------
-- is_admin(): small helper for admin_add_points and the frontend's UI gate.
-- ---------------------------------------------------------------------------

create function is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce((select p.is_admin from profiles p where p.id = auth.uid()), false);
$$;

grant execute on function is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- handle_new_user(): creates profile + wallet + welcome bonus on signup.
-- ---------------------------------------------------------------------------

create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_wallet_id uuid;
  v_welcome_bonus numeric(12, 2) := 100;
begin
  insert into profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email);

  insert into wallets (user_id, balance)
  values (new.id, v_welcome_bonus)
  returning id into v_wallet_id;

  insert into wallet_transactions (
    user_id, wallet_id, transaction_type, amount, balance_before, balance_after, description
  ) values (
    new.id, v_wallet_id, 'adjustment', v_welcome_bonus, 0, v_welcome_bonus, 'Welcome bonus'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- get_server_time(): lets the frontend compute a clock offset for the
-- countdown instead of trusting the browser clock.
-- ---------------------------------------------------------------------------

create function get_server_time()
returns timestamptz
language sql
stable
security invoker
as $$
  select now();
$$;

grant execute on function get_server_time() to authenticated;

-- ---------------------------------------------------------------------------
-- place_bet(): the only way a bet can be created. Validates stake amount,
-- round phase, and balance; debits the wallet and inserts the bet in one
-- transaction. Row-locks the wallet so concurrent bets from the same user
-- can't double-spend a balance.
-- ---------------------------------------------------------------------------

create function place_bet(
  p_round_id uuid,
  p_selected_side dice_side,
  p_amount numeric
)
returns bets
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_round game_rounds;
  v_wallet wallets;
  v_new_balance numeric(12, 2);
  v_bet bets;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount not in (10, 20, 50, 100) then
    raise exception 'Stake must be one of 10, 20, 50, or 100';
  end if;

  select * into v_round from game_rounds where id = p_round_id for update;
  if not found then
    raise exception 'Round not found';
  end if;

  if v_round.status <> 'betting' or now() >= v_round.betting_end_time then
    raise exception 'Betting is closed for this round';
  end if;

  select * into v_wallet from wallets where user_id = v_user_id for update;
  if not found then
    raise exception 'Wallet not found';
  end if;

  if v_wallet.balance < p_amount then
    raise exception 'Insufficient balance';
  end if;

  begin
    insert into bets (user_id, round_id, selected_side, amount, status)
    values (v_user_id, p_round_id, p_selected_side, p_amount, 'pending')
    returning * into v_bet;
  exception
    when unique_violation then
      raise exception 'You have already placed a bet on this round';
  end;

  v_new_balance := v_wallet.balance - p_amount;

  update wallets
    set balance = v_new_balance, updated_at = now()
    where user_id = v_user_id;

  insert into wallet_transactions (
    user_id, wallet_id, transaction_type, amount, balance_before, balance_after, reference_id, description
  ) values (
    v_user_id, v_wallet.id, 'bet', -p_amount, v_wallet.balance, v_new_balance, v_bet.id,
    'Bet on round #' || v_round.round_number
  );

  return v_bet;
end;
$$;

grant execute on function place_bet(uuid, dice_side, numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- settle_round(): generates the dice result exactly once and settles every
-- pending bet for the round. Idempotent — safe to call more than once for
-- the same round (e.g. if a cron tick is retried).
-- ---------------------------------------------------------------------------

create function settle_round(p_round_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_round game_rounds;
  v_dice integer;
  v_side dice_side;
  v_bet bets;
  v_wallet wallets;
  v_new_balance numeric(12, 2);
  v_payout numeric(12, 2);
begin
  select * into v_round from game_rounds where id = p_round_id for update;
  if not found then
    raise exception 'Round not found';
  end if;

  -- Idempotency guard: once completed, never touch it again.
  if v_round.status = 'completed' then
    return;
  end if;

  if now() < v_round.betting_end_time then
    raise exception 'Betting deadline has not passed yet';
  end if;

  -- Cryptographically-fine, server-only randomness: generated once, here,
  -- after the betting window has closed — never derived from bet totals.
  v_dice := 1 + floor(random() * 6)::integer;
  v_side := case when v_dice % 2 = 0 then 'even' else 'odd' end;

  update game_rounds
    set status = 'completed', dice_result = v_dice, winning_side = v_side, completed_at = now()
    where id = p_round_id;

  for v_bet in
    select * from bets where round_id = p_round_id and status = 'pending' for update
  loop
    if v_bet.selected_side = v_side then
      v_payout := v_bet.amount * 2;

      select * into v_wallet from wallets where user_id = v_bet.user_id for update;
      v_new_balance := v_wallet.balance + v_payout;

      update wallets set balance = v_new_balance, updated_at = now() where user_id = v_bet.user_id;

      insert into wallet_transactions (
        user_id, wallet_id, transaction_type, amount, balance_before, balance_after, reference_id, description
      ) values (
        v_bet.user_id, v_wallet.id, 'payout', v_payout, v_wallet.balance, v_new_balance, v_bet.id,
        'Payout for round #' || v_round.round_number
      );

      update bets
        set status = 'won', payout_amount = v_payout, settled_at = now()
        where id = v_bet.id;
    else
      update bets
        set status = 'lost', payout_amount = 0, settled_at = now()
        where id = v_bet.id;
    end if;
  end loop;
end;
$$;

-- Deliberately NOT granted to authenticated/anon — only pg_cron (as the
-- postgres role) may settle a round.
revoke execute on function settle_round(uuid) from public;

-- ---------------------------------------------------------------------------
-- create_next_round(): opens a fresh 60-second round starting now.
-- ---------------------------------------------------------------------------

create function create_next_round()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_next_number bigint;
  v_start timestamptz := now();
begin
  select coalesce(max(round_number), 0) + 1 into v_next_number from game_rounds;

  insert into game_rounds (round_number, status, betting_start_time, betting_end_time, result_time)
  values (v_next_number, 'betting', v_start, v_start + interval '50 seconds', v_start + interval '60 seconds');
end;
$$;

revoke execute on function create_next_round() from public;

-- ---------------------------------------------------------------------------
-- tick_rounds(): the single pg_cron entry point, run every minute. Settles
-- whatever round just ended, then makes sure a new betting round is open.
-- ---------------------------------------------------------------------------

create function tick_rounds()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_due_round record;
begin
  for v_due_round in
    select id from game_rounds where status = 'betting' and betting_end_time <= now()
  loop
    perform settle_round(v_due_round.id);
  end loop;

  if not exists (
    select 1 from game_rounds where status = 'betting' and betting_end_time > now()
  ) then
    perform create_next_round();
  end if;
end;
$$;

revoke execute on function tick_rounds() from public;

-- ---------------------------------------------------------------------------
-- admin_add_points(): the only way points are credited outside of payouts
-- and the signup bonus. Caller must be flagged is_admin in profiles.
-- ---------------------------------------------------------------------------

create function admin_add_points(
  p_user_email text,
  p_amount numeric,
  p_description text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller uuid := auth.uid();
  v_target_user uuid;
  v_wallet wallets;
  v_new_balance numeric(12, 2);
begin
  if v_caller is null then
    raise exception 'Not authenticated';
  end if;

  if not (select is_admin from profiles where id = v_caller) then
    raise exception 'Not authorized';
  end if;

  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select id into v_target_user from profiles where email = p_user_email;
  if not found then
    raise exception 'No user found with that email';
  end if;

  select * into v_wallet from wallets where user_id = v_target_user for update;
  if not found then
    raise exception 'Wallet not found for that user';
  end if;

  v_new_balance := v_wallet.balance + p_amount;

  update wallets set balance = v_new_balance, updated_at = now() where user_id = v_target_user;

  insert into wallet_transactions (
    user_id, wallet_id, transaction_type, amount, balance_before, balance_after, description
  ) values (
    v_target_user, v_wallet.id, 'adjustment', p_amount, v_wallet.balance, v_new_balance,
    coalesce(p_description, 'Admin adjustment')
  );
end;
$$;

grant execute on function admin_add_points(text, numeric, text) to authenticated;

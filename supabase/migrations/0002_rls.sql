-- Row Level Security: every user-facing table restricts reads/writes to the
-- owning user. All writes to wallets/wallet_transactions/bets/game_rounds are
-- funneled through SECURITY DEFINER functions (see 0003_functions.sql), so no
-- INSERT/UPDATE/DELETE policies are granted to the `authenticated` role here
-- — only SELECT.

alter table profiles enable row level security;
alter table wallets enable row level security;
alter table wallet_transactions enable row level security;
alter table game_rounds enable row level security;
alter table bets enable row level security;

-- profiles -------------------------------------------------------------

create policy "profiles_select_own"
  on profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_update_own"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Prevent a user from granting themselves admin (or backdating timestamps)
-- through the otherwise-permitted self-update above.
create function prevent_profile_privilege_escalation()
returns trigger
language plpgsql
as $$
begin
  new.is_admin := old.is_admin;
  new.id := old.id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_guard_privileged_fields
  before update on profiles
  for each row
  execute function prevent_profile_privilege_escalation();

-- wallets ----------------------------------------------------------------

create policy "wallets_select_own"
  on wallets for select
  to authenticated
  using (user_id = auth.uid());

-- wallet_transactions ------------------------------------------------------

create policy "wallet_transactions_select_own"
  on wallet_transactions for select
  to authenticated
  using (user_id = auth.uid());

-- game_rounds ----------------------------------------------------------

-- Shared public game state: any signed-in user can see all rounds.
create policy "game_rounds_select_all"
  on game_rounds for select
  to authenticated
  using (true);

-- bets -------------------------------------------------------------------

create policy "bets_select_own"
  on bets for select
  to authenticated
  using (user_id = auth.uid());

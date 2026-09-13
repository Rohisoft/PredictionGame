begin;
create extension if not exists pgtap;

select plan(9);

-- ---------------------------------------------------------------------------
-- Setup: two users, one round whose betting deadline has already passed,
-- with one pending bet on each side.
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333',
  'authenticated', 'authenticated', 'player-c@test.local', crypt('password123', gen_salt('bf')),
  now(), '{}', '{}', now(), now()
), (
  '00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444',
  'authenticated', 'authenticated', 'player-d@test.local', crypt('password123', gen_salt('bf')),
  now(), '{}', '{}', now(), now()
);

insert into game_rounds (id, round_number, status, betting_start_time, betting_end_time, result_time)
values (
  'bbbbbbbb-0000-0000-0000-000000000001', 900101, 'betting', now() - interval '70 seconds', now() - interval '20 seconds', now() - interval '10 seconds'
);

insert into bets (id, user_id, round_id, selected_side, amount, status)
values
  ('cccccccc-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'bbbbbbbb-0000-0000-0000-000000000001', 'odd', 50, 'pending'),
  ('cccccccc-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', 'bbbbbbbb-0000-0000-0000-000000000001', 'even', 50, 'pending');

-- ---------------------------------------------------------------------------
-- settle_round: is only callable by an elevated role, generates the result
-- once, pays the winner 2x, and is safe to call twice.
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;

select throws_like(
  $$select settle_round('bbbbbbbb-0000-0000-0000-000000000001')$$,
  '%permission denied%',
  'settle_round cannot be called by an authenticated client'
);

reset role;
select set_config('request.jwt.claims', '', true);

select lives_ok(
  $$select settle_round('bbbbbbbb-0000-0000-0000-000000000001')$$,
  'settle_round succeeds when run with elevated privileges (as pg_cron does)'
);

select is(
  (select status from game_rounds where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'completed'::round_status,
  'the round is marked completed'
);

select ok(
  (select dice_result between 1 and 6 from game_rounds where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'a dice result between 1 and 6 was generated'
);

select ok(
  (
    select bool_and(
      case
        when b.selected_side = r.winning_side then b.status = 'won' and b.payout_amount = b.amount * 2
        else b.status = 'lost' and b.payout_amount = 0
      end
    )
    from bets b join game_rounds r on r.id = b.round_id
    where b.round_id = 'bbbbbbbb-0000-0000-0000-000000000001'
  ),
  'the winning side''s bet is paid 2x stake and the losing side''s bet pays nothing'
);

-- Idempotency: calling settle_round again must not pay out a second time.
select lives_ok(
  $$select settle_round('bbbbbbbb-0000-0000-0000-000000000001')$$,
  'calling settle_round a second time on a completed round does not error'
);

select is(
  (select count(*) from wallet_transactions where reference_id in (
    'cccccccc-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000002'
  ) and transaction_type = 'payout'),
  1::bigint,
  'settling the same round twice does not create a duplicate payout transaction'
);

-- ---------------------------------------------------------------------------
-- RLS: a user can only see their own wallet and bets.
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims', json_build_object('sub', '33333333-3333-3333-3333-333333333333', 'role', 'authenticated')::text, true);
set local role authenticated;

select is(
  (select count(*) from wallets where user_id = '44444444-4444-4444-4444-444444444444'),
  0::bigint,
  'RLS hides another user''s wallet row from a regular authenticated client'
);

select is(
  (select count(*) from bets where user_id = '44444444-4444-4444-4444-444444444444'),
  0::bigint,
  'RLS hides another user''s bets from a regular authenticated client'
);

select * from finish();
rollback;

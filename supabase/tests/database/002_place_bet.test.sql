begin;
create extension if not exists pgtap;

select plan(8);

-- ---------------------------------------------------------------------------
-- Setup: two users (the on_auth_user_created trigger gives each a wallet
-- with a 100pt welcome bonus) and two rounds (one open, one already closed).
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'player-a@test.local', crypt('password123', gen_salt('bf')),
  now(), '{}', '{}', now(), now()
), (
  '00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
  'authenticated', 'authenticated', 'player-b@test.local', crypt('password123', gen_salt('bf')),
  now(), '{}', '{}', now(), now()
);

insert into game_rounds (id, round_number, status, betting_start_time, betting_end_time, result_time)
values (
  'aaaaaaaa-0000-0000-0000-000000000001', 900001, 'betting', now(), now() + interval '50 seconds', now() + interval '60 seconds'
), (
  'aaaaaaaa-0000-0000-0000-000000000002', 900002, 'betting', now() - interval '70 seconds', now() - interval '20 seconds', now() - interval '10 seconds'
);

-- Simulate player A's JWT for auth.uid().
select set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
set local role authenticated;

-- 1. Invalid stake amount is rejected.
select throws_like(
  $$select place_bet('aaaaaaaa-0000-0000-0000-000000000001', 'odd', 15)$$,
  '%Stake must be one of%',
  'place_bet rejects a stake amount outside 10/20/50/100'
);

-- 2. A valid bet succeeds and debits the wallet.
select lives_ok(
  $$select place_bet('aaaaaaaa-0000-0000-0000-000000000001', 'odd', 20)$$,
  'place_bet succeeds for a valid stake during the betting phase'
);

select is(
  (select balance from wallets where user_id = '11111111-1111-1111-1111-111111111111'),
  80::numeric(12,2),
  'wallet balance is debited by the stake amount'
);

select is(
  (select status from bets where round_id = 'aaaaaaaa-0000-0000-0000-000000000001' and user_id = '11111111-1111-1111-1111-111111111111'),
  'pending'::bet_status,
  'the new bet starts out pending'
);

-- 3. A second bet on the same round is rejected (one bet per round per user).
select throws_like(
  $$select place_bet('aaaaaaaa-0000-0000-0000-000000000001', 'even', 10)$$,
  '%already placed a bet%',
  'place_bet rejects a duplicate bet on the same round'
);

-- 4. Betting after the deadline is rejected.
select throws_like(
  $$select place_bet('aaaaaaaa-0000-0000-0000-000000000002', 'odd', 10)$$,
  '%Betting is closed%',
  'place_bet rejects a bet placed after the betting deadline'
);

-- 5. Insufficient balance is rejected (player B's balance forced to 5).
update wallets set balance = 5 where user_id = '22222222-2222-2222-2222-222222222222';
select set_config('request.jwt.claims', json_build_object('sub', '22222222-2222-2222-2222-222222222222', 'role', 'authenticated')::text, true);

select throws_like(
  $$select place_bet('aaaaaaaa-0000-0000-0000-000000000001', 'odd', 10)$$,
  '%Insufficient balance%',
  'place_bet rejects a stake the wallet cannot cover'
);

-- 6. Unauthenticated calls are rejected.
select set_config('request.jwt.claims', '', true);
select throws_like(
  $$select place_bet('aaaaaaaa-0000-0000-0000-000000000001', 'odd', 10)$$,
  '%Not authenticated%',
  'place_bet rejects a call with no authenticated user'
);

select * from finish();
rollback;

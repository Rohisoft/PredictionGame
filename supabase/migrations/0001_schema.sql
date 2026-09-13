-- Odd/Even dice game: core schema
-- Enums, tables, constraints, indexes.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type transaction_type as enum (
  'deposit', 'withdrawal', 'bet', 'payout', 'refund', 'adjustment'
);

create type round_status as enum ('betting', 'locked', 'completed', 'cancelled');

create type dice_side as enum ('odd', 'even');

create type bet_status as enum ('pending', 'won', 'lost', 'refunded');

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- wallets
-- ---------------------------------------------------------------------------

create table wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles (id) on delete cascade,
  balance numeric(12, 2) not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- wallet_transactions
-- ---------------------------------------------------------------------------

create table wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  wallet_id uuid not null references wallets (id) on delete cascade,
  transaction_type transaction_type not null,
  amount numeric(12, 2) not null,
  balance_before numeric(12, 2) not null,
  balance_after numeric(12, 2) not null,
  reference_id uuid,
  description text,
  created_at timestamptz not null default now()
);

create index wallet_transactions_user_id_idx on wallet_transactions (user_id);
create index wallet_transactions_created_at_idx on wallet_transactions (created_at desc);

-- ---------------------------------------------------------------------------
-- game_rounds
-- ---------------------------------------------------------------------------

create table game_rounds (
  id uuid primary key default gen_random_uuid(),
  round_number bigint not null unique,
  status round_status not null default 'betting',
  betting_start_time timestamptz not null,
  betting_end_time timestamptz not null,
  result_time timestamptz not null,
  dice_result integer check (dice_result between 1 and 6),
  winning_side dice_side,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index game_rounds_status_idx on game_rounds (status);
create index game_rounds_round_number_idx on game_rounds (round_number desc);

-- A round is only "done" once both the dice result and winning side are set,
-- and only completed rounds may carry a result — this is what settle_round
-- relies on to stay idempotent (see 0003_functions.sql).
alter table game_rounds
  add constraint game_rounds_result_consistency check (
    (status = 'completed' and dice_result is not null and winning_side is not null)
    or (status <> 'completed' and dice_result is null and winning_side is null)
  );

-- ---------------------------------------------------------------------------
-- bets
-- ---------------------------------------------------------------------------

create table bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  round_id uuid not null references game_rounds (id) on delete cascade,
  selected_side dice_side not null,
  amount numeric(12, 2) not null check (amount > 0),
  status bet_status not null default 'pending',
  payout_amount numeric(12, 2) not null default 0 check (payout_amount >= 0),
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  -- one bet per user per round — keeps "place_bet" and the UI simple, and
  -- gives settle_round a natural unit of work to iterate over exactly once.
  unique (round_id, user_id)
);

create index bets_user_id_idx on bets (user_id);
create index bets_round_id_idx on bets (round_id);
create index bets_status_idx on bets (status);
create index bets_created_at_idx on bets (created_at desc);

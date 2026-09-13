begin;
create extension if not exists pgtap;

select plan(10);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'wallets', 'wallets table exists');
select has_table('public', 'wallet_transactions', 'wallet_transactions table exists');
select has_table('public', 'game_rounds', 'game_rounds table exists');
select has_table('public', 'bets', 'bets table exists');

select col_is_pk('public', 'bets', 'id', 'bets has a primary key on id');

select col_has_check('public', 'wallets', 'balance', 'wallets.balance has a check constraint (non-negative)');

select has_index('public', 'bets', 'bets_user_id_idx', 'bets is indexed on user_id');
select has_index('public', 'bets', 'bets_round_id_idx', 'bets is indexed on round_id');

-- unique (round_id, user_id) prevents a user from placing two bets on the same round
select col_is_unique('public', 'bets', array['round_id', 'user_id'], 'one bet per user per round is enforced');

select * from finish();
rollback;

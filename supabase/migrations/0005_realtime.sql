-- Enable Realtime (Postgres logical replication) for the tables the
-- frontend subscribes to. Without this, `supabase.channel(...).on(
-- 'postgres_changes', ...)` subscriptions never fire — the app falls back
-- to its polling intervals only, which is why round results and the
-- recent-results strip appeared to "not update" until the next poll (or,
-- for a round that already got replaced by a newer one, never).

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'game_rounds'
  ) then
    alter publication supabase_realtime add table game_rounds;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'bets'
  ) then
    alter publication supabase_realtime add table bets;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'wallets'
  ) then
    alter publication supabase_realtime add table wallets;
  end if;
end;
$$;

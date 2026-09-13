-- Schedules tick_rounds() to run every minute via pg_cron, and seeds the
-- very first round so the app has something to show immediately after
-- migrations are applied (rather than waiting up to 60s for the first tick).
--
-- NOTE: on some hosted Supabase plans pg_cron must first be turned on via
-- Dashboard > Database > Extensions before this migration will apply
-- cleanly — see the README's "Database setup" section.

create extension if not exists pg_cron;

select cron.schedule(
  'tick-game-rounds',
  '* * * * *',
  $$select tick_rounds();$$
);

select create_next_round();

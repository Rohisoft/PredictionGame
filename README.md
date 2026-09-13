# Odd/Even — Dice Prediction Game

A fast-paced, 60-second-round odd/even dice prediction game. Players pick Odd
or Even, stake a fixed number of virtual points, and find out the result
when the round's dice roll is revealed.

This build uses **virtual points, not real money**. There is no payment
gateway and no user-facing deposit/withdrawal flow — an administrator credits
points to a player's wallet directly. Every new signup also gets a 100-point
welcome bonus so the game is playable immediately.

All security- and fairness-critical logic — bet validation, wallet debits,
dice generation, and settlement — lives in Postgres functions, never in the
frontend. See [`supabase/migrations/0003_functions.sql`](supabase/migrations/0003_functions.sql).

## Tech stack

- React + Vite + TypeScript, Tailwind CSS, shadcn/ui-style components
- TanStack Query for data fetching/caching, Zod + react-hook-form for forms
- Supabase: Postgres, Auth, Realtime, Row Level Security, pg_cron
- Netlify for static hosting

## How the game works

- Each round lasts 60 seconds: **50 seconds of betting**, then a **10 second
  reveal**.
- Pick **Odd** (1, 3, 5) or **Even** (2, 4, 6) and a stake of ₹10, ₹20, ₹50,
  or ₹100.
- A standard six-sided dice is rolled once per round, on the server, after
  betting closes — see "Fairness" below.
- A winning bet pays **2× the stake** (stake included). A losing bet pays
  nothing.

## Fairness & security model

- **Dice generation happens once, server-side, after the betting deadline.**
  `settle_round()` (a Postgres `SECURITY DEFINER` function) generates the
  result with Postgres's own RNG only after `betting_end_time` has passed —
  it has no way to see or react to how much was staked on either side, and
  it's idempotent (safe to call more than once for the same round).
- **Round scheduling has no external server.** A single function,
  `tick_rounds()`, is scheduled every minute via `pg_cron`. It settles any
  round whose betting window just closed and opens the next one. This
  function — along with `settle_round()` and `create_next_round()` — is
  **not** granted to the `authenticated` or `anon` roles, so it can only run
  as the elevated role `pg_cron` uses, never from the client.
- **Bets are placed through one function, `place_bet()`,** which re-checks
  (server-side, regardless of what the UI shows) that the round is still in
  its betting window, the stake is one of the four allowed amounts, and the
  wallet has sufficient balance — then debits the wallet and inserts the bet
  atomically, row-locking the wallet to prevent a race from double-spending
  a balance.
- **Row Level Security** is enabled on every user-facing table. Users can
  only ever `SELECT` their own wallet, transactions, and bets; there are no
  client-side `INSERT`/`UPDATE`/`DELETE` policies on those tables at all —
  every write goes through a `SECURITY DEFINER` function.
- **Admin point grants** go through `admin_add_points()`, which checks the
  caller's own `profiles.is_admin` flag server-side before crediting anyone
  — the admin page in the UI is just a convenience; the real check is in the
  database.

## Project structure

```
src/
  components/   UI primitives (ui/), layout, game, wallet, admin components
  hooks/        Auth, wallet, round, bet data hooks (React Query + Realtime)
  lib/          Supabase client, server-time sync, query client, utils
  pages/        Route-level pages
  schemas/      Zod validation schemas
  types/        Hand-written row types matching the Postgres schema
supabase/
  migrations/   SQL migrations: schema -> RLS -> functions -> cron
  tests/database/  pgTAP tests for the database layer
tests/unit/     Vitest unit tests (schemas, timer/phase math)
```

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Create a free project at [supabase.com](https://supabase.com), or run the
stack locally with the Supabase CLI:

```bash
npm install -g supabase   # or: brew install supabase/tap/supabase
supabase start
```

`supabase start` prints a local API URL and anon key you can use for step 3.

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your project's
Settings → API page (or from `supabase start`'s output for local dev).
**Never** put the `service_role` key in this file — it must never reach the
frontend.

### 4. Apply database migrations

Against a local stack, migrations in `supabase/migrations/` are applied
automatically by `supabase start`. Against a hosted project, link it and
push:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

> **Heads up on `pg_cron`:** [`0004_cron.sql`](supabase/migrations/0004_cron.sql)
> runs `create extension if not exists pg_cron;`. On some hosted Supabase
> plans this extension must first be turned on via **Dashboard → Database →
> Extensions** before the migration will apply cleanly. Local dev via the
> CLI does not have this restriction.

### 5. Promote an admin (optional)

There's no self-serve admin promotion UI by design. After signing up, run
this once in the SQL editor (or `supabase db execute` locally) for whichever
account should be able to grant points:

```sql
update profiles set is_admin = true where email = 'you@example.com';
```

### 6. Run the app

```bash
npm run dev
```

## Testing

### Frontend unit tests (Vitest)

```bash
npm run test
```

Covers Zod schema validation (stake amounts, admin point grants, auth forms)
and the pure round-phase/countdown math used by the timer.

### Database tests (pgTAP)

Requires the Supabase CLI and Docker (`supabase start` running):

```bash
supabase test db
```

[`supabase/tests/database/`](supabase/tests/database) covers:

- Schema shape: tables, primary keys, indexes, the non-negative balance
  check, and the one-bet-per-user-per-round unique constraint.
- `place_bet()`: rejects invalid stakes, rejects betting after the deadline,
  rejects insufficient balance, rejects a second bet on the same round,
  rejects unauthenticated calls, and correctly debits the wallet on success.
- `settle_round()`: cannot be called by an authenticated client (only the
  elevated cron role), generates a dice result once, pays the winning side
  2× stake, leaves the losing side at zero, and is safe to call twice
  without double-paying (idempotency).
- Row Level Security: a user cannot read another user's wallet or bets.

### What isn't automated here

Mobile responsiveness and the full signup → bet → settlement flow are best
verified manually in a browser (`npm run dev`, then resize/use device
emulation). Concurrent bet placement is guarded at the database level by
row-locking the wallet inside `place_bet()`, but isn't exercised by an
automated load test in this repo.

## Deployment (Netlify)

1. Push this repo to GitHub/GitLab/Bitbucket and import it in Netlify, or
   run `netlify deploy` from the CLI.
2. Netlify reads [`netlify.toml`](netlify.toml) for the build command
   (`npm run build`), publish directory (`dist`), and the SPA redirect rule
   that sends all routes to `index.html` for React Router.
3. In Netlify's Site settings → Environment variables, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   Only the anon key — never the `service_role` key.
4. Trigger a deploy. That's it; there's no separate backend to deploy since
   all backend logic lives in Supabase (Postgres functions + pg_cron).

## Responsible play

This is a game of chance played with virtual points, not real currency.
It's built for players 18 and over. If real money were ever introduced,
the admin point-grant flow would need to be replaced with a licensed
payment gateway and reviewed against the gambling regulations of every
jurisdiction the app operates in — that is explicitly out of scope here.

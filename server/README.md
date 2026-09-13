# Odd/Even API (Node.js + Express + MongoDB)

The backend for the Odd/Even dice game — bet validation, atomic wallet
debits, server-only dice generation, idempotent settlement — built on
Express + Mongoose, with custom JWT auth. This project used to run on
Supabase/Postgres; that's gone now, this is the only backend. The frontend
(`../src`) talks to this API over plain HTTP via `../src/lib/apiClient.ts`.

## Why MongoDB transactions require a replica set

`placeBet`, `settleRound`, and `adminAddPoints` all use MongoDB
multi-document transactions (`mongoose.startSession()` +
`session.withTransaction()`) to keep a wallet debit/credit and the
bet/transaction record it belongs to atomic — the equivalent of the
`SELECT ... FOR UPDATE` row locking used in the Postgres version. Transactions
require MongoDB to be running as a replica set. A standalone `mongod` does
not support them at all. MongoDB Atlas clusters are replica sets by default,
even on the free (M0) tier, so no extra setup is needed there for
production. For local dev without Atlas, the `mongo` service in
[`../docker-compose.yml`](../docker-compose.yml) runs a single-node replica
set for you — see the root README's "Local development" section for the
one-command way to run everything (Mongo + this API + the frontend).

## Environment variables

```bash
cp .env.example .env
```

- `MONGODB_URI` — see the two options below.
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — long random strings (`openssl rand -hex 32`).
- `CORS_ORIGIN` — your frontend origin(s), comma-separated. Also used as the
  base URL for password-reset links.
- `SMTP_*` — optional; without them, password-reset links are just logged to
  the server console instead of emailed (fine for local dev).

## Local development

**Easiest path**: run everything (Mongo + this API + the frontend) via the
root `docker-compose.yml` — see the main [README](../README.md#local-development).
That builds this folder using `Dockerfile` (a `node:20-alpine` image running
`npm run dev` with your source bind-mounted, so edits hot-reload) and
points it at the `mongo` service automatically.

**Running the API by itself** (against Atlas, or a Mongo you're managing
some other way):

```bash
cp .env.example .env   # fill in MONGODB_URI, JWT secrets, etc.
npm install
npm run dev
```

Starts the API on `http://localhost:4000` (or `PORT`) and, in-process, a
`node-cron` job that ticks every minute to settle the current round and open
the next one — see `src/jobs/roundScheduler.ts`. There is no external
scheduler dependency; as long as this process stays running, rounds keep
advancing.

## Auth model

Custom JWT auth, no external auth provider:

- Passwords hashed with bcrypt (12 rounds).
- On login/signup, an access token (short-lived) and refresh token
  (long-lived) are issued as `httpOnly` cookies — not returned in the
  response body, so they're not reachable from frontend JS (XSS-resistant).
- A hash of the current refresh token is stored on the user document
  (`refreshTokenHash`); `/api/auth/refresh` checks the presented token's hash
  against it. This is what lets `/api/auth/logout` and a password reset
  actually invalidate the session server-side, not just clear a cookie.
  Simplification: **one active session per user** — logging in on a new
  device signs out any other session. Multi-session support would need an
  array of token hashes instead of one field.
- In production, cookies are `Secure; SameSite=None` (required for a
  frontend and API on different domains); locally, `SameSite=Lax` over http.

## API endpoints

All routes are under `/api`. Endpoints other than `/server-time` and the
`/auth/*` ones require the `accessToken` cookie (`requireAuth` middleware).

| Method | Path | Notes |
|---|---|---|
| GET | `/server-time` | For the frontend's clock-offset countdown sync |
| POST | `/auth/signup` | `{ email, password, fullName }` — creates user + wallet + 100pt bonus |
| POST | `/auth/login` | `{ email, password }` |
| POST | `/auth/refresh` | Rotates the access/refresh cookies |
| POST | `/auth/logout` | Auth required |
| POST | `/auth/forgot-password` | `{ email }` — always returns `{ ok: true }`, doesn't leak whether the email exists |
| POST | `/auth/reset-password` | `{ token, password }` |
| GET | `/profile` | Current user |
| GET | `/wallet` | Current balance |
| GET | `/wallet/transactions` | Last 100 transactions |
| GET | `/rounds/current` | Latest round by round number |
| GET | `/rounds/recent?limit=20` | Completed rounds, newest first |
| GET | `/rounds/:id` | One round by id — for polling a specific round's result (see the frontend's `useRoundById` for why this matters) |
| POST | `/bets` | `{ roundId, selectedSide, amount }` |
| GET | `/bets/mine?limit=50` | Bet history, with round populated |
| GET | `/bets/mine/round/:roundId` | This user's bet (if any) on a specific round |
| POST | `/admin/add-points` | Admin only — `{ userEmail, amount, description? }` |

There's no round-settlement endpoint exposed over HTTP at all —
`settleRound`/`createNextRound`/`tickRounds` are only ever called from
`src/jobs/roundScheduler.ts`, never from a route handler, mirroring how the
Postgres functions were never granted to the `authenticated` role.

## Promoting an admin

No self-serve promotion endpoint, by design — same as the Supabase version.
Flip it directly in the database:

```js
db.users.updateOne({ email: "you@example.com" }, { $set: { isAdmin: true } })
```

## Testing

```bash
npm run test
```

Uses `mongodb-memory-server` in **replica-set mode** (required for the same
reason production needs Atlas — transactions) so `placeBet`/`settleRound`
run against a real, disposable MongoDB rather than mocks. Covers: invalid
stake rejection, insufficient-balance rejection, betting-after-deadline
rejection, duplicate-bet-per-round rejection, win/loss payout math,
settlement idempotency, signup's wallet+bonus creation, login success/failure,
and the password-reset flow (including that resetting invalidates the old
password).

The first run downloads a MongoDB binary for `mongodb-memory-server` — this
needs network access and may be slow or fail in a sandboxed/offline CI
environment; if so, run these tests somewhere with normal internet access.

## What's intentionally out of scope here (per your answers)

- **Hosting**: not addressed — deploy the Express app anywhere that keeps a
  process running (Render, Railway, Fly.io, a VPS, etc.); `node-cron` needs
  a long-lived process, so plain serverless functions won't work for the
  scheduler without swapping it for an externally-triggered `/tick` route.
- **Real-time updates**: none. The frontend (once wired up) will need to
  poll `GET /rounds/current` / `GET /rounds/:id` on an interval, same as the
  fallback polling already in the existing hooks. Socket.io can be added
  later without changing the REST API.

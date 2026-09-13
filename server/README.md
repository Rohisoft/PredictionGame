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

Custom JWT auth, no external auth provider, **no public self-signup**:
accounts are created by an admin (`POST /admin/users`, email + full name,
no password) and the person activates their own account by running the
"forgot password" flow for their email — there's no separate activation
token system; setting a password from `null` is the same operation as
resetting an existing one (`authService.resetPassword`). Logging in
against an account with no password yet fails with a distinct message
telling the person to use "forgot password" instead of a generic
invalid-credentials error.

- Passwords hashed with bcrypt (12 rounds).
- On login, an access token (short-lived) and refresh token (long-lived)
  are issued as `httpOnly` cookies — not returned in the response body, so
  they're not reachable from frontend JS (XSS-resistant).
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
| POST | `/auth/login` | `{ email, password }` — fails with a distinct message if the account has no password set yet |
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
| GET | `/admin/users?search=&limit=` | Admin only — list users with their wallet balance |
| POST | `/admin/users` | Admin only — `{ email, fullName }`, creates user + wallet + 100pt bonus, no password set |
| GET | `/admin/users/:id/transactions` | Admin only — a specific user's transaction history |
| POST | `/admin/adjust-points` | Admin only — `{ userEmail, amount, description? }`; positive credits, negative debits (never below zero) |

There's no round-settlement endpoint exposed over HTTP at all —
`settleRound`/`createNextRound`/`tickRounds` are only ever called from
`src/jobs/roundScheduler.ts`, never from a route handler, mirroring how the
Postgres functions were never granted to the `authenticated` role.

## Bootstrapping the first admin

`POST /admin/users` (creating an account) requires an existing admin — so
the very first admin has to be created directly in the database once, the
same way `adminCreateUser` would: insert the user (no password), a wallet
with the welcome bonus, and set `isAdmin: true`.

```js
// mongosh, against the app's database
const userId = new ObjectId();
db.users.insertOne({
  _id: userId,
  email: "you@example.com",
  fullName: "Admin",
  isAdmin: true,
  passwordHash: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});
db.wallets.insertOne({ userId, balance: 100, createdAt: new Date(), updatedAt: new Date() });
```

Then use the app's "Forgot password" flow for `you@example.com` to set a
password (the reset link is logged to the server console unless SMTP is
configured — see the environment variables above). From then on, that
account can create every other user via the admin page, and promote
further admins the same way if it ever needs to (no self-serve promotion
endpoint, by design — flip `isAdmin` directly in the database for that).

## Testing

```bash
npm run test
```

Uses `mongodb-memory-server` in **replica-set mode** (required for the same
reason production needs Atlas — transactions) so `placeBet`/`settleRound`
run against a real, disposable MongoDB rather than mocks. Covers: invalid
stake rejection, insufficient-balance rejection, betting-after-deadline
rejection, duplicate-bet-per-round rejection, win/loss payout math,
settlement idempotency, account creation's wallet+bonus setup, login
success/failure (including the no-password-yet case), the password-reset /
first-time-activation flow, and admin user management (listing, search,
credit/debit with the below-zero guard, account creation).

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

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
`node-cron` job that ticks every minute — see `src/jobs/roundScheduler.ts`.
There is no external scheduler dependency; as long as this process stays
running, whatever round is in flight keeps settling on time. Whether a *new*
round opens after that is gated by a simple on/off switch any admin
controls (see below) — rounds don't advance at all while it's off.

## Role hierarchy and the points economy

Three roles (`User.role`): `user` (a player), `admin` (manages their own
players), `superadmin` (manages admins). This isn't just an access-control
distinction — points actually move through the hierarchy rather than being
minted wherever an admin feels like it:

- **superadmin → admin** is a mint: `POST /superadmin/admins/adjust-points`
  credits (or debits) an admin's wallet directly, with no source to deduct
  from — a superadmin sits at the top, so this is how new points enter the
  economy at all. New admin accounts start at 0 balance (no welcome bonus)
  precisely so they have to be recharged before they can give anything out.
- **admin → their own player** is a transfer: `POST /admin/adjust-points`
  moves points out of the *admin's own wallet* into the player's (or back,
  for a negative amount) — see `adminAdjustPoints` in `adminService.ts`.
  Two wallets change in the same transaction, both guarded so neither goes
  negative. An admin can never target their own account through this
  endpoint, and can only target players they personally created
  (`User.createdBy`) — a superadmin isn't ownership-restricted and can
  adjust any player, still by transfer from their own wallet.
- Players still get the usual 100pt welcome bonus on creation, from either
  an admin or a superadmin — that one's still a flat mint, unrelated to the
  creating admin's balance (creating an account doesn't cost anything;
  actually funding it afterward does).

A superadmin's own `/admin/*` access (listing/adjusting players,
create-user) is unrestricted by `createdBy` — full oversight of everyone.
A plain admin only ever sees/manages accounts where `createdBy` is
themselves. `GET /superadmin/admins` and `POST /superadmin/admins` are
superadmin-only (`requireSuperAdmin` middleware).

## Auth model

Custom JWT auth, no external auth provider, **no public self-signup**, and
**username is the login identifier** — not email. Accounts are created by
an admin (`POST /admin/users`: username + an admin-chosen initial password
+ full name, with email/phone optional), and the account is flagged
`mustChangePassword: true`. The frontend forces a change-password step
right after that account's first successful login
(`POST /auth/change-password`, `ProtectedRoute` redirects there whenever
`profile.must_change_password` is true). Email (when present) is only used
to deliver "forgot password" links for later recovery — it's not how
anyone signs in.

If a user has no email on file (or is otherwise locked out) and needs a
password reset, an admin can set one directly:
`POST /admin/users/set-password` — this re-flags `mustChangePassword: true`
and invalidates any existing session, the same as a normal reset would.

Since usernames are the identifier, `POST /admin/users` and
`GET /admin/users/check-username` also support suggesting available
alternatives when a desired username is taken (optionally incorporating a
phone number's digits, since a phone number is itself a valid username
under `USERNAME_PATTERN` — letters/digits/`.`/`_`, 3-30 chars).

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
| POST | `/auth/login` | `{ username, password }` |
| POST | `/auth/refresh` | Rotates the access/refresh cookies |
| POST | `/auth/logout` | Auth required |
| POST | `/auth/change-password` | Auth required — `{ currentPassword, newPassword }`, clears `mustChangePassword` |
| POST | `/auth/forgot-password` | `{ username }` — always returns `{ ok: true }`; emails a reset link only if the account has an email on file |
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
| GET | `/admin/users/check-username?username=&phone=` | Admin only — availability + suggested alternatives if taken |
| POST | `/admin/users` | Admin only — `{ username, password, fullName, email?, phone? }`, creates user + wallet + 100pt bonus |
| POST | `/admin/users/set-password` | Admin only — `{ username, password }`, resets someone's password directly (e.g. no email on file / locked out) |
| GET | `/admin/users/:id/transactions` | Admin only — a specific user's transaction history |
| POST | `/admin/adjust-points` | Admin only — `{ username, amount, description? }`; transfers between the caller's own wallet and a player they created (never below zero on either side) |
| GET | `/superadmin/admins?search=&limit=` | Superadmin only — list admin accounts with their balance |
| POST | `/superadmin/admins` | Superadmin only — same body as `/admin/users`; creates an admin (0 starting balance) |
| POST | `/superadmin/admins/adjust-points` | Superadmin only — `{ username, amount, description? }`; mints/debits an admin's wallet directly, no source deduction |
| GET | `/admin/rounds/state` | Admin only — `{ is_game_running, current_round }` |
| POST | `/admin/rounds/start` | Admin only — switches the game on and opens a round immediately if none is open |
| POST | `/admin/rounds/stop` | Admin only — switches the game off and cancels (fully refunds) whatever round is currently taking predictions |
| GET | `/rounds/game-state` | Any authenticated user — `{ is_game_running }`, so the game UI can show a paused banner |

`settleRound`/`createNextRound`/`tickRounds` themselves are still never
exposed directly over HTTP — only `src/jobs/roundScheduler.ts` calls them,
same as before. What's new is the on/off switch (`GameSettings`, a one-row
singleton collection) and `cancelRound`, both reachable only through the two
admin routes above. `tickRounds()` always settles whatever round's betting
window just closed — regardless of the switch — so a bet already placed is
never left unresolved; it just stops opening a *next* round while the
switch is off. `POST /admin/rounds/stop` cancels the in-flight round rather
than letting it run out with no admin watching: every pending bet on it is
refunded in full (`Bet.status = "refunded"`, a `refund` wallet transaction),
no dice roll happens, and the round's own `status` becomes `"cancelled"`.
This privilege belongs to any `admin`-or-above account, not just
superadmins — it's global game state, not scoped to a caller's own players.

## Bootstrapping the first superadmin

`POST /superadmin/admins` (creating an admin) requires an existing
superadmin — so the very first one has to be created directly in the
database once: insert the user with a bcrypt hash of a password you pick,
`role: "superadmin"`, and a wallet (balance doesn't really matter for a
superadmin, since giving points to an admin is a mint, not a transfer —
0 is fine).

```js
// In Node, first hash a password: require("bcryptjs").hashSync("your-temp-password", 12)
// Then, in mongosh against the app's database:
const userId = new ObjectId();
db.users.insertOne({
  _id: userId,
  username: "admin",
  fullName: "Admin",
  role: "superadmin",
  mustChangePassword: true,
  passwordHash: "<paste the bcrypt hash here>",
  createdAt: new Date(),
  updatedAt: new Date(),
});
db.wallets.insertOne({ userId, balance: 0, createdAt: new Date(), updatedAt: new Date() });
```

Log in as `admin` with the temp password you hashed — `mustChangePassword`
being `true` means the app immediately routes you to set your own password.
From then on, that account can create admin accounts (`POST
/superadmin/admins`), recharge them, and — same as any admin — create and
manage its own players directly. No self-serve promotion endpoint, by
design; flip `role` directly in the database if you ever need to change
someone's tier by hand.

## Testing

```bash
npm run test
```

Uses `mongodb-memory-server` in **replica-set mode** (required for the same
reason production needs Atlas — transactions) so `placeBet`/`settleRound`
run against a real, disposable MongoDB rather than mocks. Covers: invalid
stake rejection, insufficient-balance rejection, betting-after-deadline
rejection, duplicate-bet-per-round rejection, win/loss payout math,
settlement idempotency, account creation's wallet+bonus setup, username-
based login success/failure, `changePassword`, password-reset recovery,
and the full role hierarchy: admin↔player point transfers (including
self-adjustment and cross-admin ownership being rejected), superadmin↔admin
minting (including that the superadmin's own balance is untouched),
scoped listing (an admin only sees players they created; a superadmin
sees everyone), username availability/suggestions, and admin-driven
password resets.

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

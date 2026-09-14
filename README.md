# Odd/Even — Dice Prediction Game

A fast-paced, 60-second-round odd/even dice prediction game. Players pick Odd
or Even, stake a fixed number of virtual points, and find out the result
when the round's dice roll is revealed.

This build uses **virtual points, not real money**. There is no payment
gateway and no user-facing deposit/withdrawal flow — an administrator credits
points to a player's wallet directly. There's also no public sign-up: an
admin creates every account (choosing a username and initial password),
and the person changes that password themselves on first login. Every new
account also gets a 100-point welcome bonus so the game is playable
immediately.

All security- and fairness-critical logic — bet validation, wallet debits,
dice generation, and settlement — lives on the backend, never in the
frontend. See [`server/src/services/gameService.ts`](server/src/services/gameService.ts).

## Repo layout

This is two projects in one repo:

- `/` (this directory) — the React frontend.
- `server/` — a Node.js/Express + MongoDB API. **Read [`server/README.md`](server/README.md)**
  for how its auth, transactions, and round scheduler work — this file only
  covers the frontend and how the two fit together.

There is no Supabase/Postgres anywhere in this repo anymore — the project
started on Supabase and was fully migrated to the Node/MongoDB backend
described above.

## Tech stack

- **Frontend**: React + Vite + TypeScript, Tailwind CSS, shadcn/ui-style
  components, TanStack Query, Zod + react-hook-form
- **Backend**: Node.js + Express + Mongoose (MongoDB), custom JWT auth
- **Hosting**: Render — a Static Site for the frontend, a Docker-based Web
  Service for the backend (needs a persistent process for the round
  scheduler), MongoDB Atlas for the database. See "Deployment" below.

## How the game works

- Each round lasts 60 seconds: **50 seconds to submit a prediction**, then a
  **10 second reveal**.
- Pick **Odd** (1, 3, 5) or **Even** (2, 4, 6) and put 10, 20, 50, or 100
  points on it.
- A standard six-sided dice is rolled once per round, on the server, after
  predictions close — see "Fairness" below.
- Get it right and get **2× your points** back (points included). Get it
  wrong and those points are gone.

## Fairness & security model

- **Dice generation happens once, server-side, after the betting deadline.**
  `settleRound()` generates the result with Node's CSPRNG (`crypto.randomInt`)
  only after `bettingEndTime` has passed — it has no way to see or react to
  how much was staked on either side, and it's idempotent (safe to call more
  than once for the same round).
- **Round scheduling has no external dependency.** A `node-cron` job inside
  the API process ticks every minute, settling any round whose betting
  window just closed and opening the next one (`server/src/jobs/roundScheduler.ts`).
  Settlement is never exposed over HTTP — there's no route for it at all,
  only the in-process scheduler can trigger it.
- **Bets are placed through one function, `placeBet()`,** which re-checks
  (server-side, regardless of what the UI shows) that the round is still in
  its betting window, the stake is one of the four allowed amounts, and the
  wallet has sufficient balance — then debits the wallet and inserts the bet
  atomically inside a MongoDB transaction, so a race can't double-spend a
  balance.
- **Every route scopes queries to the requesting user** (`req.userId` from
  the verified JWT) — there's no database-level access control like
  Postgres RLS here, so this scoping is enforced in each route/service
  function instead. See `server/README.md` for specifics.
- **Admin point grants** go through `adminAddPoints()`, which checks the
  caller's own `isAdmin` flag server-side before crediting anyone — the
  admin page in the UI is just a convenience; the real check is in the API.

## Project structure

```
src/
  components/   UI primitives (ui/), layout, game, wallet, admin components
  hooks/        Auth, wallet, round, bet data hooks (React Query + polling)
  lib/          API client (fetch + cookies), server-time sync, query client, utils
  pages/        Route-level pages
  schemas/      Zod validation schemas
  types/        Row types matching the API's JSON response shape
tests/unit/     Vitest unit tests (schemas, timer/phase math)
server/         Node.js/Express + MongoDB API — see server/README.md
```

## Local development

There are three moving parts — MongoDB, the API (`server/`), and the
frontend (this directory) — and the whole thing runs from a single
`docker-compose.yml` at the repo root. Nothing needs to be installed on
your machine except Docker.

### Option A: everything via Docker (recommended)

```bash
docker compose up -d --build
```

This builds and starts all three:

- `mongo` — MongoDB as a single-node replica set (initialized automatically
  by the one-shot `mongo-init` service), on `localhost:27017`
- `server` — the API on `http://localhost:4000`, source bind-mounted so
  code changes hot-reload (via `tsx watch`) without rebuilding the image
- `web` — the frontend on `http://localhost:5173`, same hot-reload setup
  via Vite's dev server

`server/.env` (see `server/README.md` if you need to regenerate it) supplies
the JWT secrets, CORS origin, etc.; `docker-compose.yml` overrides just
`MONGODB_URI` so the API reaches Mongo at its in-network hostname (`mongo`)
instead of `localhost`.

Check everything's up with `docker compose ps` (all three should show
`running`/`healthy`). There's no public sign-up — see `server/README.md`
for how to bootstrap the first admin account, then use the admin page to
create a player account, and sign in at `http://localhost:5173/login`.

Logs: `docker compose logs -f server` (or `web`, or `mongo`). Stop
everything with `docker compose down` (add `-v` to also wipe the Mongo
data volume).

### Option B: run natively (no Docker)

Follow [`server/README.md`](server/README.md) to set up MongoDB (Atlas, or
its own Docker Compose snippet) and `server/.env`, then:

```bash
cd server && npm install && npm run dev     # API on :4000
```

In another terminal:

```bash
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:4000/api
npm run dev             # frontend on :5173
```

### Bootstrapping the first admin

There's no public sign-up and no self-serve admin promotion — the very
first admin account has to be inserted directly in MongoDB once. See
`server/README.md`'s "Bootstrapping the first admin" for the exact steps;
after that, admins can create every other account (and promote further
admins) from the admin page.

## Testing

### Frontend unit tests (Vitest)

```bash
npm run test
```

Covers Zod schema validation (stake amounts, admin point grants, auth forms)
and the pure round-phase/countdown math used by the timer.

### Backend tests

```bash
cd server && npm run test
```

Runs against a real MongoDB replica set (via `mongodb-memory-server`), not
mocks — see `server/README.md` for exactly what's covered (bet validation,
settlement payout math and idempotency, auth/password-reset, and the JSON
serialization shape each model produces).

### What isn't automated here

Mobile responsiveness and the full signup → bet → settlement flow are best
verified manually in a browser (`npm run dev`, then resize/use device
emulation). A one-off manual smoke test of the real HTTP layer (cookies,
CORS, the full signup → bet → logout flow via curl) was run during
development but isn't part of the repeatable test suite.

## Deployment

Three pieces: MongoDB Atlas (free tier), a Render Web Service for the
backend (Docker-based, so it just runs `server/Dockerfile` — no separate
build/start commands to configure), and a Render Static Site for the
frontend.

### 1. Database — MongoDB Atlas

Free M0 cluster (it's a real replica set even on the free tier, which
`placeBet`/`settleRound`'s transactions require). Create a database user,
and under **Network Access** add `0.0.0.0/0` (Render's outbound IPs aren't
static). Copy the `mongodb+srv://...` connection string — that's your
`MONGODB_URI`.

### 2. Backend — Render Web Service (Docker)

- Root directory `server`, environment **Docker** (auto-detected from
  `server/Dockerfile`) — leave build/start commands blank, Docker mode
  ignores them.
- Env vars: `MONGODB_URI`, `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
  (`openssl rand -hex 32` each), `JWT_ACCESS_EXPIRES_IN=15m`,
  `JWT_REFRESH_EXPIRES_IN=30d`, `NODE_ENV=production`, and `PORT=10000`
  (Render's default port — the app reads `process.env.PORT`, see
  `server/src/config/env.ts`; the app also binds `0.0.0.0` explicitly,
  see `server/src/server.ts`, which Docker services require).
- `CORS_ORIGIN`: see step 4 below — with the same-origin proxy set up
  there, this mostly matters as a fallback, since the browser will no
  longer be making genuinely cross-origin requests to this service.

### 3. Frontend — Render Static Site

- Root directory blank, build `npm install && npm run build`, publish
  directory `dist`.
- `VITE_API_URL=/api` — **relative**, not the backend's full URL. See why
  below.

### 4. Redirects/Rewrites — the part that's easy to get wrong

Render's free static sites and web services live on different
`onrender.com` subdomains. Browsers treat different subdomains of a
shared public hosting domain like `onrender.com` as separate *sites* —
so a naive setup (frontend calling the backend's full URL directly) makes
every API call a cross-site request, and the httpOnly auth cookies it sets
become cross-site cookies. Mobile Safari (and, increasingly, other mobile
browsers) blocks those by default — **login appears to silently do
nothing**: the request succeeds, the cookie never gets stored, and the
very next request looks logged-out again.

The fix is to not be cross-site at all: proxy `/api/*` through the
frontend's own origin, so the browser only ever talks to one hostname.
On the frontend Static Site → **Redirects/Rewrites**, add both of these,
**in this order** (the API rule must be evaluated before the catch-all,
or the catch-all swallows every `/api/*` request and serves `index.html`
instead of proxying it):

| Source | Destination | Action |
|---|---|---|
| `/api/*` | `https://<your-backend>.onrender.com/api/*` | Rewrite |
| `/*` | `/index.html` | Rewrite |

The second rule is also what makes direct navigation/refreshes on any
non-`/` route (e.g. `/login`) work at all — without it, Render's static
file server 404s on any path it doesn't have a literal file for, since it
never gets a chance to hand off to React Router.

With both in place: the browser only ever sees `predictiongame-x.onrender.com`
(one origin), the proxied response's `Set-Cookie` header lands as a
first-party cookie, and mobile login/redirect behaves the same as desktop.

### 5. Keep the backend awake

Render's free web services sleep after 15 minutes of no inbound traffic —
which would stall the in-process round scheduler. A free external pinger
(cron-job.org or UptimeRobot) hitting the backend's `GET /health` every
few minutes keeps it alive. See `server/README.md` for details.

### 6. Bootstrap the first superadmin

There's no public sign-up. Run `server/scripts/bootstrap-superadmin.js`
against your Atlas connection string — see `server/README.md`'s
"Bootstrapping the first superadmin".

## Responsible play

This is a game of chance played with virtual points, not real currency.
It's built for players 18 and over. If real money were ever introduced,
the admin point-grant flow would need to be replaced with a licensed
payment gateway and reviewed against the gambling regulations of every
jurisdiction the app operates in — that is explicitly out of scope here.

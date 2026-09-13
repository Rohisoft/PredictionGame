# Odd/Even — Dice Prediction Game

A fast-paced, 60-second-round odd/even dice prediction game. Players pick Odd
or Even, stake a fixed number of virtual points, and find out the result
when the round's dice roll is revealed.

This build uses **virtual points, not real money**. There is no payment
gateway and no user-facing deposit/withdrawal flow — an administrator credits
points to a player's wallet directly. Every new signup also gets a 100-point
welcome bonus so the game is playable immediately.

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
- **Hosting**: Netlify (frontend, static) + anywhere that keeps a process
  alive (backend — Render/Railway/Fly.io/a VPS/etc.; see `server/README.md`)

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
`running`/`healthy`), then open `http://localhost:5173`, sign up, and you
should land on the game page with a 100-point welcome bonus.

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

### Promoting an admin

No self-serve promotion UI, by design. After signing up, flip the flag
directly in MongoDB for whichever account should be able to grant points —
see `server/README.md`.

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

**Frontend (Netlify):**

1. Push this repo to GitHub/GitLab/Bitbucket and import it in Netlify, or
   run `netlify deploy` from the CLI.
2. Netlify reads [`netlify.toml`](netlify.toml) for the build command
   (`npm run build`), publish directory (`dist`), and the SPA redirect rule
   that sends all routes to `index.html` for React Router.
3. In Netlify's Site settings → Environment variables, add `VITE_API_URL`
   pointing at your deployed API's URL (e.g. `https://api.yourapp.com/api`).
4. Trigger a deploy.

**Backend:** deploy `server/` anywhere that keeps a Node process running
(the round scheduler needs that) — see `server/README.md`'s "hosting" note.
Set `CORS_ORIGIN` on the API to your Netlify URL so cookies are accepted
cross-site, and make sure `NODE_ENV=production` there so auth cookies get
`Secure; SameSite=None`.

## Responsible play

This is a game of chance played with virtual points, not real currency.
It's built for players 18 and over. If real money were ever introduced,
the admin point-grant flow would need to be replaced with a licensed
payment gateway and reviewed against the gambling regulations of every
jurisdiction the app operates in — that is explicitly out of scope here.

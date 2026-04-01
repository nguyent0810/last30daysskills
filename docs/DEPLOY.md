# Deployment runbook (Vercel + Railway + Neon)

MVP stack: **Next.js** on **Vercel**, **worker** on **Railway**, **Postgres** on **Neon** (or any Postgres reachable from both).

## 1. Neon database

1. Create a project at [Neon](https://neon.tech).
2. Copy the **pooled** connection string (`postgresql://...@...neon.tech/...?sslmode=require`).
3. Use the **same** `DATABASE_URL` on Vercel and Railway.

## 2. Required environment variables

### Vercel (web / Next.js)

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Neon pooled URL; used by Route Handlers only (server-side). |
| `SESSION_SECRET` | Yes | Min 16 chars. `openssl rand -hex 32` |
| `NODE_ENV` | Auto | Vercel sets `production`. |
| `GEMINI_API_KEY` | No | Optional transient “AI summary” on the job page only; not stored; worker does not use it. |
| `GEMINI_MODEL` | No | Default `gemini-2.0-flash`. |

Do **not** expose `DATABASE_URL` or `SESSION_SECRET` to the client (they are not prefixed with `NEXT_PUBLIC_`).

### Railway (worker only)

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Same as Vercel. |
| `WORKER_POLL_MS` | No | Default `3000`. |
| `OPENAI_API_KEY` | No | If set, final report markdown is optionally polished via OpenAI; if unset or on API failure, the deterministic report is stored as before. |
| `OPENAI_MODEL` | No | Default `gpt-4o-mini`. |

The worker **does not** need `SESSION_SECRET` (sessions are handled by the Next.js app).

## 3. Schema (Drizzle) — apply before first traffic

From a machine with this repo and network access to Neon:

```bash
npm install
export DATABASE_URL="postgresql://..."   # or use .env.local with dotenv-cli
npx dotenv-cli -e .env.local -- drizzle-kit push
```

Or without dotenv-cli:

```bash
set DATABASE_URL=postgresql://...   # Windows PowerShell: $env:DATABASE_URL="..."
npx drizzle-kit push
```

Use the same schema the app expects (`lib/db/schema.ts`). Re-run after schema changes.

## 4. Vercel (web)

1. Import the Git repo (branch `automation` or your default).
2. **Framework preset:** Next.js (auto).
3. **Build command:** `npm run build` (default).
4. **Output:** default (no Docker required for the web app).
5. Add **Environment Variables** (Production + Preview if needed): `DATABASE_URL`, `SESSION_SECRET`.
6. Deploy.

**Note:** Do not run `npm run build` locally while `npm run dev` is running against the same `.next` folder (see README troubleshooting).

## 5. Railway (worker)

Use a **second** service in the same project or a dedicated Railway service pointing at the **same repo**.

### Option A — Dockerfile (recommended)

- **Root directory:** repo root.
- **Builder:** Dockerfile.
- **Dockerfile path:** `Dockerfile.worker` (see repo).
- Set env `DATABASE_URL` (and optional `WORKER_POLL_MS`).

### Option B — Nixpacks (manual settings)

Nixpacks may try to run `npm run build` (Next.js). For a **worker-only** service, set in Railway UI:

- **Build command:** `npm install` (or `npm ci`)
- **Start command:** `npm run worker`
- **Do not** use the default “Next.js” build if it forces a full web build you do not need.

### Exactly one worker

Run **one** Railway replica (scale = 1) so only one process polls the `queued` jobs table. Multiple workers can cause duplicate processing races in this MVP.

### First-time Railway steps (copy checklist)

1. In [Railway](https://railway.app), create a project and **Deploy from GitHub** → select this repository, branch **`automation`** (or your production branch).
2. If Railway created a default web service, either delete it or add a **second** service so the worker is separate from Vercel’s Next.js app.
3. For the **worker** service: **Settings → Build** → set builder to **Dockerfile** (repo root). **Dockerfile path:** `Dockerfile.worker`. (`railway.toml` in the repo already sets this when Railway detects it.)
4. **Variables** tab: add **`DATABASE_URL`** with the **same** Neon pooled connection string as Vercel. Optionally `WORKER_POLL_MS`, `OPENAI_API_KEY`, `OPENAI_MODEL`.
5. **Settings → Deploy** (or Scaling): **Replicas = 1**.
6. Deploy and open **Logs**. You should see `Worker polling every 3000ms` (or your `WORKER_POLL_MS`). If the container exits, check that `DATABASE_URL` is set and reachable from Railway’s region.
7. Smoke-test from your machine: `.\scripts\staging-smoke.ps1` with `$env:STAGING_BASE_URL = "https://last30daysskills.vercel.app"` (after Vercel shows `ready: true` on `/api/health`).

## 6. Post-deploy smoke checks (staging / production)

### Manual

1. Open the deployed site; confirm **GET `/api/health`** returns JSON with `ok: true`, `ready: true`, and `checks` showing `databaseUrl` and `sessionSecret` both true. If `ready` is false, fix Vercel environment variables (`DATABASE_URL`, `SESSION_SECRET` ≥ 16 chars) and redeploy.
2. Open **Home**, submit a topic; confirm redirect to **`/job/[id]`** and status updates.
3. Open **History**; confirm the job appears for that browser session.
4. Confirm **Sources** table shows HN / Polymarket / Reddit rows (some may `failed` if DNS/rate limits).
5. Confirm **Report** renders markdown when the job succeeds.

### Automated (API)

From a machine with PowerShell and network access to the **HTTPS** deployment (required for session cookies in production — see §6 “Local HTTP vs production cookies”):

```powershell
$env:STAGING_BASE_URL = "https://your-deployment.vercel.app"
.\scripts\staging-smoke.ps1
```

This exercises: `/api/health`, anonymous session, job create, polling, history list, `sourceRuns`, and report body on success.

### Local HTTP vs production cookies

`next start` runs with `NODE_ENV=production`, so session cookies include **`Secure`**. Browsers and scripts using **HTTP** (e.g. `http://localhost`) will not send those cookies, so API calls after create session return **401**. For a local end-to-end API check without HTTPS, use **`npm run dev`** (development omits `Secure`) plus a running worker, or test against the real **HTTPS** staging URL.

## 7. Operational discipline

- **One worker process** in production (Railway scale = 1).
- **Restart worker** after deploys that change `lib/jobs`, `lib/research`, or `worker/`.
- **Polymarket** may fail if `gamma-api.polymarket.com` is unreachable from the worker region; jobs can still succeed on HN + Reddit.

## 8. Local vs staging

- Local: `npm run dev` + `npm run worker` + `.env.local`.
- Staging: same env semantics; use Preview env vars on Vercel and a separate Neon branch if desired.

## 9. Local “production mode” smoke (no Vercel needed)

After `npm run build`:

```bash
PORT=3000 npm run start    # Windows PowerShell: $env:PORT=3000; npm run start
curl -s http://localhost:3000/api/health
```

Expect: `{"ok":true,"service":"web"}`. This mirrors the Vercel server bundle. Full job flow still needs a running worker + `DATABASE_URL` + `SESSION_SECRET` in the environment.

## 10. CLI deploy (optional)

- **Vercel:** `vercel login` once, then `vercel link` in the repo, or connect the Git repo in the Vercel dashboard. Non-interactive CI: set `VERCEL_TOKEN` and use `vercel deploy --prod --token $env:VERCEL_TOKEN` (see Vercel docs).
- **Railway:** install `@railway/cli`, `railway login`, then `railway up` or attach the repo in the dashboard. Set `DATABASE_URL` on the worker service.

## 11. End-to-end staging verification (real URLs)

Prerequisites: Neon schema applied (`npm run db:push` against the staging URL), web deployed to Vercel (HTTPS), **one** Railway worker with the same `DATABASE_URL`.

Use the **HTTPS** Vercel hostname (required for `Secure` session cookies in production).

### Worker without `OPENAI_API_KEY` (deterministic report path)

On Railway, leave `OPENAI_API_KEY` unset (or remove it), redeploy/restart the worker, then:

```powershell
$env:STAGING_BASE_URL = "https://your-deployment.vercel.app"
.\scripts\staging-smoke.ps1 -ExpectDeterministicDisclaimer
```

The script checks health, session, job create, polling, history, `sourceRuns`, and that the stored report still contains the deterministic disclaimer text `Generated without AI` (heuristic for deterministic-only path).

### Worker with `OPENAI_API_KEY` (optional polish path)

Set `OPENAI_API_KEY` (and optional `OPENAI_MODEL`) on the Railway worker, redeploy/restart, then:

```powershell
$env:STAGING_BASE_URL = "https://your-deployment.vercel.app"
.\scripts\staging-smoke.ps1
```

Expect job success and a non-empty report; the disclaimer may be absent or rewritten—do **not** use `-ExpectDeterministicDisclaimer` here.

### Deploy automation without platform credentials

A machine with **no** `vercel login` / `VERCEL_TOKEN` and **no** `railway login` / `RAILWAY_TOKEN` cannot create or update Vercel/Railway services from the CLI. Run the deploy steps locally or in CI after storing platform tokens as secrets.

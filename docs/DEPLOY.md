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

Do **not** expose `DATABASE_URL` or `SESSION_SECRET` to the client (they are not prefixed with `NEXT_PUBLIC_`).

### Railway (worker only)

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Same as Vercel. |
| `WORKER_POLL_MS` | No | Default `3000`. |

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

## 6. Post-deploy smoke checks (staging / production)

1. Open the deployed site; confirm **GET `/api/health`** returns JSON `{"ok":true}` (or 200).
2. Open **Home**, submit a topic; confirm redirect to **`/job/[id]`** and status updates.
3. Open **History**; confirm the job appears for that browser session.
4. Confirm **Sources** table shows HN / Polymarket / Reddit rows (some may `failed` if DNS/rate limits).
5. Confirm **Report** renders markdown when the job succeeds.

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

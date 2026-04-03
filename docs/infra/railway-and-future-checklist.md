# Railway / deployment — infra note & future checklist

**Purpose:** Capture what exists today so we are not stuck when a Railway trial ends or services are reorganized. This is **planning documentation only** — not a migration guide.

**Canonical runbook:** [docs/DEPLOY.md](../DEPLOY.md) (step-by-step Vercel + Railway + Neon).

**Repo sources for this note:** `railway.toml`, `Dockerfile.worker`, `package.json`, `worker/index.ts`, `lib/db/index.ts`, `.env.example`, `docs/DEPLOY.md`.

---

## 1. Current service map

| Piece | Role | Expected host | Start / build (from repo) |
|--------|------|----------------|---------------------------|
| **Web app** | Next.js 14: UI, API routes, sessions, job enqueue | **Vercel** (not Railway for this project) | `npm run build` → `npm run start` (Vercel default) |
| **Worker** | Long-running poller: claims `queued` jobs, runs HN / Polymarket / Reddit pipeline, writes reports to DB | **Railway** (dedicated service) | **Dockerfile:** `Dockerfile.worker` → `CMD ["npm", "run", "worker"]` i.e. `tsx worker/index.ts`. `railway.toml` pins Dockerfile build. |
| **Database** | Postgres for users, researches, jobs, reports, source runs | **Neon** (or any Postgres reachable from Vercel + Railway) | No app container — connection via `DATABASE_URL` |
| **Other** | None in repo (no separate queue service, no Railway cron in config) | — | — |

**Important:** Web and worker are **two separate runtimes**. Vercel env vars do **not** apply to Railway automatically.

---

## 2. Required environment variables by service

*No secret values here — names and intent only.*

### Web (Vercel / Next.js)

| Variable | Required? | Purpose / source |
|----------|-----------|------------------|
| `DATABASE_URL` | **Yes** | API routes / server-side DB (Neon pooled URL typical) |
| `SESSION_SECRET` | **Yes** (≥ 16 chars) | Signed anonymous session cookie |
| `NODE_ENV` | Auto | `production` on Vercel |
| `GEMINI_API_KEY` | No | Optional job-page Gemini summary (transient, not stored) |
| `GEMINI_MODEL` | No | Default in code if unset |

### Worker (Railway)

| Variable | Required? | Purpose / source |
|----------|-----------|------------------|
| `DATABASE_URL` | **Yes at runtime** | Worker exits immediately if missing (`worker/index.ts`). Must be set on the **worker service**, not only on Vercel. Same DB URL as web unless intentionally split. |
| `NODE_ENV` | Set in image | `production` in `Dockerfile.worker` |
| `WORKER_POLL_MS` | No | Poll interval (default `3000`) |
| `OPENAI_API_KEY` | No | Optional report polish in worker path |
| `OPENAI_MODEL` | No | Default `gpt-4o-mini` in code |
| `REDDIT_USER_AGENT` | No | Strongly recommended in production (Reddit / egress) |
| `REDDIT_DISABLED` | No | Set to `1` to skip Reddit |

**Worker does not use:** `SESSION_SECRET`, `GEMINI_*` (web-only).

### Shared / external

| Piece | Config |
|--------|--------|
| **DB** | One `DATABASE_URL` conventionally shared by Vercel + Railway worker (see `.env.example`). |
| **OpenAI** | Worker only, optional. |
| **Gemini** | Vercel only, optional. |
| **HN / Polymarket / Reddit** | Public HTTP from worker; no API keys in repo for HN/Polymarket. |

### `db:*` npm scripts (local / CI)

Use `dotenv-cli` **without** `-o` so **platform env wins** over `.env` files (see `package.json`). `.env.local` fills **missing** keys locally only.

---

## 3. Runtime assumptions (code-grounded)

- **Web and worker are separate processes.** Enqueue happens in Next API; processing happens only if the worker runs and can reach the same DB.
- **Worker depends on DB directly** (`getDb()` / `Pool` via `DATABASE_URL`). No message queue in between.
- **`.env.local` / `.env`** are for **local dev** (and optional `dotenv` load in `worker/index.ts`). The **Docker worker image does not copy** those files — Railway must inject env.
- **Deploy/runtime env** for production must come from **Vercel (web)** and **Railway (worker)** variable UIs (or linked variable references), not from committed files.

---

## 4. “Before Railway expires” checklist

Use this when the trial is ending or you are auditing the project.

- [ ] **Worker service** has **`DATABASE_URL`** set (same DB as production web unless intentional).
- [ ] **Web (Vercel)** still has **`DATABASE_URL`** + **`SESSION_SECRET`**.
- [ ] Confirm **DB ownership:** Neon dashboard (or Railway Postgres if you ever switched) — who bills, branch strategy, backup/export policy.
- [ ] **Worker:** Dockerfile path `Dockerfile.worker`, start is `npm run worker`; **replicas = 1** (avoid duplicate job processing).
- [ ] **Export a list of variable *names*** (not values) from Railway worker + Vercel for your runbook / password manager notes.
- [ ] **Decide:** stay on Railway (paid), consolidate, or migrate worker elsewhere — *decision only; no implementation in this doc.*
- [ ] If migrating worker later: provision new host, set the same env names, point at same `DATABASE_URL`, deploy image or equivalent start command, then cut over one worker at a time.

---

## 5. Migration readiness (short)

**Preserve if you move later:** Same Postgres data + same `DATABASE_URL` semantics; one worker consumer for the `queued` job model; env parity (`DATABASE_URL`, optional `OPENAI_*`, `REDDIT_*`, `WORKER_POLL_MS`).

**Easiest to move first:** The **worker** service only (swap Railway for another container host or PaaS) while keeping Neon + Vercel unchanged.

**Do not rush changing:** Schema and job-claiming logic without a migration plan; avoid running **multiple** workers until claim semantics are explicitly multi-worker-safe.

---

## Blocking issues (code review vs. this doc)

**Already known:** Worker restart loop if **`DATABASE_URL` is missing** on the Railway worker service — configuration, not application bug.

**No additional critical runtime variables** were identified beyond: web needs `DATABASE_URL` + `SESSION_SECRET`, worker needs **`DATABASE_URL`** at process start. Optional vars are listed above.

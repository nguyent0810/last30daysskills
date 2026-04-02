# CRM Research — Phase 1B

Topic → queued job → worker (Hacker News + Polymarket + Reddit public JSON) → deterministic markdown report. **Anonymous session** via signed HTTP-only cookie (`crm_session`). No OAuth.

**Deployment:** see [docs/DEPLOY.md](docs/DEPLOY.md) (Vercel + Railway worker + Neon).

## Requirements

- Node 18+
- Postgres `DATABASE_URL` (Neon pooler or local Docker)
- **`SESSION_SECRET`** (min 16 chars) — `openssl rand -hex 32`

## Setup

```bash
npm install
```

Create `.env.local`:

```
DATABASE_URL=postgresql://...
SESSION_SECRET=...   # required in Phase 1B
```

Apply schema:

```bash
npm run db:push
```

## Run

Terminal 1 — web:

```bash
npm run dev
```

Terminal 2 — worker:

```bash
npm run worker
```

Open the URL Next prints (e.g. `http://localhost:3000`). Use **New** to start a topic, **History** for this browser’s research threads (each thread lists runs and supports rerun).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev |
| `npm run build` | Production build |
| `npm run worker` | Job poller |
| `npm test` | Vitest |
| `npm run db:push` | Drizzle push (loads `.env.local`) — **canonical** way to apply `lib/db/schema.ts` |
| `npm run db:backfill-research` | One-time idempotent link: legacy jobs → `researches` + `research_id` (after schema adds those) |
| `npm run db:inspect -- <job-id>` | DB row summary |
| `npm run db:studio` | Drizzle Studio |

## API (Phase 1B)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/session` | Ensures anonymous cookie |
| POST | `/api/jobs` | **Exactly one** of: `{ "topic": "…" }` (new research + first run) or `{ "researchId": "<uuid>" }` (new run under that thread). Response: `{ id, status, researchId }` (`id` = run / job id). Wrong/missing body → **400**. Unknown or other user’s `researchId` → **404** `{ "error": "Not found" }`. Sets session cookie if new user. **Rerun** clears **`archived_at`** on that research (auto-unarchive) on success. |
| GET | `/api/jobs` | Default: **active** threads only (`archived_at IS NULL`). Optional **`?archived=1`**: archived only. Payload shape as before (`displayTitle`, etc.). Ordered by **`researches.updatedAt` desc** (rerun bumps; rename / archive / unarchive do **not**). Session cookie as needed. **History** uses **`/history`** vs **`/history?archived=1`** for the same list UI. |
| GET | `/api/jobs/[id]` | Run detail: `job` (includes `researchId` or `null` for legacy rows), **`thread`**: `{ id, topic, displayTitle }` or **`null`** (always present), `report`, `sourceRuns`, `items`, etc. Not your run → **404**. |
| GET | `/api/research/[id]` | Research includes **`archivedAt`** (ISO string or **`null`**) + **`displayTitle`**, **`topic`**, ordered `runs[]`, optional **`sincePreviousRun`**. Not found / not yours → **404**. |
| PATCH | `/api/research/[id]` | **One** of: **`{ "displayTitle": "<string>" \| null }`** → **200** `{ id, topic, displayTitle }`; or **`{ "archived": true \| false }`** → **200** `{ id, archivedAt }`. Not both keys. Archive: sets **`archived_at = now()`** only if currently active (idempotent repeat); unarchive: **`null`**. Does **not** bump **`updatedAt`**. |

## Sources

- **Hacker News** — Algolia API  
- **Polymarket** — Gamma API (keyword filter)  
- **Reddit** — `search.json` only, with a descriptive `User-Agent`  

## Phase 1B notes

- **Auth:** Signed cookie (`SESSION_SECRET`), `users.kind = anonymous`. Legacy `internal` rows from Phase 1A may remain in DB; new users are anonymous.
- **Research + runs:** Each topic thread is a `researches` row; each execution is a `research_jobs` row with `research_id` set. **Legacy jobs** with null `research_id` still load in the UI; **Rerun** from those uses `{ topic }` and creates a **new** thread (see API table).
- **Copy for reuse** (run page): copies topic, run time, full report, and a deduped **Sources** list (title + URL only) to the clipboard — no extra export pipeline. URL matching uses `lib/url-match.ts` (same rules as below).
- **Since last run** (thread page): when meaningful, shows “N new links since last run” (newest vs previous run only); hidden otherwise.
- **Thread display title:** `researches.display_title` — optional label only; **`topic`** stays canonical for reruns. Incremental SQL: `drizzle/0001_researches_display_title.sql`.
- **Archive:** `researches.archived_at` — **`null`** = visible in default History. Incremental SQL: `drizzle/0002_researches_archived_at.sql`.
- **Reports:** Deterministic markdown (no OpenAI in this phase).
- **Schema fallback:** Incremental SQL for existing DBs: `drizzle/0000_…`, `0001_…`, `0002_researches_archived_at.sql`. Apply with **`npm run db:migrate:incremental`** (uses `DATABASE_URL` from `.env.local`) or **`npm run db:push`**. Production (e.g. Neon): run the same SQL in the host’s SQL editor if CI cannot reach the DB.
- If outbound access to a source fails (DNS, rate limit), that source is marked failed; the job still succeeds if at least one source returns data.

## Runtime troubleshooting (Phase 1B.5)

- **Do not run `npm run build` while `npm run dev` is running** (same `.next` directory). Stop dev first, or you will see 500s and missing chunk errors until you restart `next dev`.
- **Run exactly one worker** (`npm run worker`). A second stale process can process jobs with an older codebase and skip sources (e.g. only two source runs instead of three). Restart the worker after pulling code changes.
- **`gamma-api.polymarket.com` not resolving** — Polymarket shows `failed` in source runs; HN + Reddit can still succeed.
- **Reddit** requires a descriptive `User-Agent` (already set in code). Rate limits may apply.

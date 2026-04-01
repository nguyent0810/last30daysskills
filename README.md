# CRM Research — Phase 1A

Internal prototype: topic → queued job → worker (HN + Polymarket) → deterministic report.

## Requirements

- Node 18+
- Postgres `DATABASE_URL` (Neon pooler connection string works; local Docker Postgres works for dev)

## Setup

```bash
npm install
```

Create `.env.local` (Next.js loads it; the worker loads `.env.local` and `.env` via `dotenv`):

```
DATABASE_URL=postgresql://user:password@host/dbname
```

Apply schema (loads env from `.env.local` / `.env`):

```bash
npm run db:push
```

## Run

Terminal 1 — web:

```bash
npm run dev
```

Terminal 2 — worker (required for jobs to complete):

```bash
npm run worker
```

Open the URL Next prints (often `http://localhost:3000`) — submit a topic and poll status.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev |
| `npm run build` | Production build |
| `npm run worker` | Job poller |
| `npm test` | Vitest |
| `npm run db:push` | `drizzle-kit push` with env from `.env.local` |
| `npm run db:inspect -- <job-id>` | Print job, source runs, item count, report length from DB |
| `npm run db:studio` | Drizzle Studio (with env) |

## Phase 1A.5 verification (hardening)

1. Apply schema: `npm run db:push`
2. Run `npm run dev` and `npm run worker` with the same `DATABASE_URL`
3. `POST /api/jobs` with `{"topic":"..."}`; poll `GET /api/jobs/<id>` until `succeeded` or `failed`
4. Inspect DB: `npm run db:inspect -- <job-id>` or SQL against `research_jobs`, `research_source_runs`, `research_items`, `reports`

**Note:** If outbound DNS/network blocks `gamma-api.polymarket.com`, the Polymarket source run may `failed` while HN still succeeds; the job still completes if at least one source works.

## Phase 1A notes

- **DB driver:** `pg` + Drizzle `node-postgres` (Neon pooler URL or any standard Postgres URL).
- **User model:** single `internal` user row (`ensureInternalUserId`). Phase 1B can add signed-cookie anonymous users without schema churn.
- **No OpenAI** in this phase; reports are deterministic markdown.

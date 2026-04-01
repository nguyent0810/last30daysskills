# CRM Research — Phase 1B

Topic → queued job → worker (Hacker News + Polymarket + Reddit public JSON) → deterministic markdown report. **Anonymous session** via signed HTTP-only cookie (`crm_session`). No OAuth.

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

Open the URL Next prints (e.g. `http://localhost:3000`). Use **New** to submit a topic, **History** for this browser’s jobs.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev |
| `npm run build` | Production build |
| `npm run worker` | Job poller |
| `npm test` | Vitest |
| `npm run db:push` | Drizzle push (loads `.env.local`) |
| `npm run db:inspect -- <job-id>` | DB row summary |
| `npm run db:studio` | Drizzle Studio |

## API (Phase 1B)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/session` | Ensures anonymous cookie |
| POST | `/api/jobs` | Create job (`{ topic }`), sets cookie if new |
| GET | `/api/jobs` | List jobs for current session |
| GET | `/api/jobs/[id]` | Job + report + source runs (403/404 if not your job) |

## Sources

- **Hacker News** — Algolia API  
- **Polymarket** — Gamma API (keyword filter)  
- **Reddit** — `search.json` only, with a descriptive `User-Agent`  

## Phase 1B notes

- **Auth:** Signed cookie (`SESSION_SECRET`), `users.kind = anonymous`. Legacy `internal` rows from Phase 1A may remain in DB; new users are anonymous.
- **Reports:** Deterministic markdown (no OpenAI in this phase).
- If outbound access to a source fails (DNS, rate limit), that source is marked failed; the job still succeeds if at least one source returns data.

## Runtime troubleshooting (Phase 1B.5)

- **Do not run `npm run build` while `npm run dev` is running** (same `.next` directory). Stop dev first, or you will see 500s and missing chunk errors until you restart `next dev`.
- **Run exactly one worker** (`npm run worker`). A second stale process can process jobs with an older codebase and skip sources (e.g. only two source runs instead of three). Restart the worker after pulling code changes.
- **`gamma-api.polymarket.com` not resolving** — Polymarket shows `failed` in source runs; HN + Reddit can still succeed.
- **Reddit** requires a descriptive `User-Agent` (already set in code). Rate limits may apply.

# CRM Research — Phase 1A

Internal prototype: topic → queued job → worker (HN + Polymarket) → deterministic report.

## Requirements

- Node 18+
- Neon Postgres `DATABASE_URL`

## Setup

```bash
npm install
```

Create `.env.local` (Next.js) and `.env` (worker) with:

```
DATABASE_URL=postgresql://...
```

Apply schema:

```bash
npx drizzle-kit push
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

Open http://localhost:3000 — submit a topic and poll status.

## Scripts

| Script        | Purpose        |
|---------------|----------------|
| `npm run dev` | Next.js dev    |
| `npm run build` | Production build |
| `npm run worker` | Job poller   |
| `npm test`    | Vitest         |
| `npm run db:push` | Drizzle push to DB |

## Phase 1A notes

- **User model**: single `internal` user row (`ensureInternalUserId`). Phase 1B can add signed-cookie anonymous users without schema churn.
- **No OpenAI** in this phase; reports are deterministic markdown.

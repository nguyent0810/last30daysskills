# Deployment and database migrations

## When this matters

Any release that changes `lib/db/schema.ts` or adds files under `drizzle/*.sql` **must** run migrations against the **same** database the app uses in production **before** (or immediately when) that code serves traffic. Otherwise inserts/updates can fail with errors like *column does not exist*.

## Immediate fix (schema drift on `researches`)

If production throws on thread/job creation after a deploy:

1. **Point `DATABASE_URL` at the production database** (shell, CI secret, or hosting env).

2. **Apply incremental SQL** (idempotent, safe to re-run):

   ```bash
   npm run db:migrate:incremental
   ```

   This runs, in order:

   - `drizzle/0001_researches_display_title.sql`
   - `drizzle/0002_researches_archived_at.sql`
   - `drizzle/0003_researches_pin_note.sql`
   - `drizzle/0004_researches_share.sql` — `share_token`, feedback counters, index
   - `drizzle/0005_researches_observability.sql` — `share_copy_count`, `public_view_count`, `last_*` timestamps

3. **Verify** the `researches` table:

   ```bash
   npm run db:verify-schema
   ```

4. **Retry** the failing flow (e.g. `POST /api/jobs`).

### Manual verification (SQL)

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'researches'
ORDER BY column_name;
```

Confirm these exist (among others):

| Column                 | Purpose                          |
|------------------------|----------------------------------|
| `share_token`          | Public share links               |
| `share_feedback_up`    | Public 👍                        |
| `share_feedback_down`  | Public 👎                        |
| `share_copy_count`     | Copy-share intent                |
| `public_view_count`    | Public view signal               |
| `last_shared_at`       | Last copy-share                  |
| `last_public_view_at`  | Last public view POST            |

## Prevention (checklist)

Use this on every deploy that includes schema changes:

1. [ ] Migrations applied to **production** `DATABASE_URL`.
2. [ ] `npm run db:verify-schema` exits **0** against production.
3. [ ] Smoke test: create a run / thread (`POST /api/jobs`) succeeds.

**Ordering rule:** Do not roll out application code that **writes** new columns until the database has those columns. If deploy is automated: run `db:migrate:incremental` as a release step **before** switching traffic, or run it immediately after deploy and before marking the release healthy.

## Optional: CI / release pipeline

Add `npm run db:verify-schema` as a post-deploy or pre-traffic step so drift is caught with a **clear operator message** instead of user-facing 500s on `POST /api/jobs`.

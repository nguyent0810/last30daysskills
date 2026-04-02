-- PR1 incremental migration: add `researches` and nullable `research_jobs.research_id`.
-- Intended for databases that already have `users` and `research_jobs`.
--
-- Apply (pick one):
--   • drizzle-kit push — uses lib/db/schema.ts as source of truth (recommended for dev).
--   • psql:  psql "$DATABASE_URL" -f drizzle/0000_researches_and_research_id.sql
--
-- Idempotent: safe to re-run (IF NOT EXISTS / duplicate constraint ignored).

CREATE TABLE IF NOT EXISTS "researches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"topic" text NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);

DO $$
BEGIN
  ALTER TABLE "researches" ADD CONSTRAINT "researches_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "research_jobs" ADD COLUMN IF NOT EXISTS "research_id" uuid;

DO $$
BEGIN
  ALTER TABLE "research_jobs" ADD CONSTRAINT "research_jobs_research_id_researches_id_fk"
    FOREIGN KEY ("research_id") REFERENCES "researches"("id");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "researches_user_id_idx" ON "researches" ("user_id");

CREATE INDEX IF NOT EXISTS "research_jobs_research_id_idx" ON "research_jobs" ("research_id");

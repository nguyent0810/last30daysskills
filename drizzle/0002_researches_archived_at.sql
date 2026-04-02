-- Soft archive: hide threads from default History without deletion.
-- Idempotent add column.

ALTER TABLE "researches" ADD COLUMN IF NOT EXISTS "archived_at" timestamptz;

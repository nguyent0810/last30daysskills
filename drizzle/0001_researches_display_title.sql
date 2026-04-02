-- Add optional display title for research threads (canonical `topic` unchanged).
-- Idempotent: safe to re-run.

ALTER TABLE "researches" ADD COLUMN IF NOT EXISTS "display_title" text;

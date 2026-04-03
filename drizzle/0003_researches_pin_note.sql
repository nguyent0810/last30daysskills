-- Phase 3: pin + short thread note (idempotent)
ALTER TABLE researches ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
ALTER TABLE researches ADD COLUMN IF NOT EXISTS thread_note text;

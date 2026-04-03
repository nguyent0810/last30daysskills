-- Phase 5: shareable thread + lightweight feedback (idempotent)
ALTER TABLE researches ADD COLUMN IF NOT EXISTS share_token text;
ALTER TABLE researches ADD COLUMN IF NOT EXISTS share_feedback_up integer NOT NULL DEFAULT 0;
ALTER TABLE researches ADD COLUMN IF NOT EXISTS share_feedback_down integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS researches_share_token_key ON researches (share_token)
  WHERE share_token IS NOT NULL;

-- Phase 5.6: lightweight observability for share + public view (idempotent)
ALTER TABLE researches ADD COLUMN IF NOT EXISTS share_copy_count integer NOT NULL DEFAULT 0;
ALTER TABLE researches ADD COLUMN IF NOT EXISTS public_view_count integer NOT NULL DEFAULT 0;
ALTER TABLE researches ADD COLUMN IF NOT EXISTS last_shared_at timestamp with time zone;
ALTER TABLE researches ADD COLUMN IF NOT EXISTS last_public_view_at timestamp with time zone;

-- ============================================================================
-- 20261009000005_guest_avatar_photo.sql   (safe to re-run)
--
-- Guest profile picture. A guest shows either an emoji avatar (guest_accounts.avatar) or an
-- uploaded photo (guest_accounts.photo_path). Photos are stored in the public bucket
-- `guest-avatars`, under <account id>/<random name>.<ext>. Uploads and removals only happen
-- from the server (service role), so the bucket needs no insert or update policy for guests.
-- Apply in the Supabase SQL editor.
-- ============================================================================

BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES ('guest-avatars', 'guest-avatars', true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.guest_accounts ADD COLUMN IF NOT EXISTS photo_path text;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'guest_accounts_photo_path_check') THEN
        ALTER TABLE public.guest_accounts ADD CONSTRAINT guest_accounts_photo_path_check
            CHECK (photo_path IS NULL OR photo_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$');
    END IF;
END $$;

COMMIT;

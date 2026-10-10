-- ============================================================================
-- 20261010000016_photo_vault_tags.sql   (safe to re-run)
--
-- Dish photos carry the dish names and tags a vision model read from the picture, so they can be
-- matched to menu items without anyone typing a title. Apply in the Supabase SQL editor.
-- ============================================================================

BEGIN;

ALTER TABLE public.venue_photo_vault ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

COMMIT;

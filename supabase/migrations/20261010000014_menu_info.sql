-- ============================================================================
-- 20261010000014_menu_info.sql   (safe to re-run)
--
-- Venue information shown on the guest menu: the tagline, address, delivery line, phone numbers,
-- service timings and the house notes (for example "Allow us 25-30 minutes to serve you").
-- Stored once per venue as JSON; the host edits it and the guest menu reads it.
-- Apply in the Supabase SQL editor. Nothing is dropped.
-- ============================================================================

BEGIN;

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS menu_info jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMIT;

-- ============================================================================
-- 20261010000015_photo_vault_repair.sql   (safe to re-run)
--
-- The Photo Vault table was never created in this project, so Smart Stock Images and the picker
-- failed with "table not found". This creates it as the code expects, and adds the is_active column
-- the matcher filters on. Existing rows are kept. Apply in the Supabase SQL editor.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.venue_photo_vault (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venue_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    time_tag TEXT,
    image_url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.venue_photo_vault ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.venue_photo_vault ALTER COLUMN category SET DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_venue_photo_vault_venue_active ON public.venue_photo_vault (venue_id, is_active);

ALTER TABLE public.venue_photo_vault ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on venue_photo_vault" ON public.venue_photo_vault;
CREATE POLICY "Allow public read access on venue_photo_vault" ON public.venue_photo_vault
    FOR SELECT TO anon, authenticated USING (is_active);

COMMIT;

-- Ask PostgREST to pick up the new table straight away.
NOTIFY pgrst, 'reload schema';

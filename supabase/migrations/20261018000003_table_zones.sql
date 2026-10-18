-- ============================================================================
-- 20261018000003_table_zones.sql   (safe to re-run)
--
-- Table zones: an optional area label for a table ("Ground floor", "First floor", "Riverside", "Rooftop"), so the table
-- screens can group tables under headings. Additive only: the column is nullable, nothing existing changes, and a table
-- keeps its number (T-01 ...) as its identity, so QR links, bills and kitchen tickets are untouched. A table with no
-- zone simply sits under no heading.
-- ============================================================================

ALTER TABLE public.restaurant_tables ADD COLUMN IF NOT EXISTS zone text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_tables_zone_length') THEN
    ALTER TABLE public.restaurant_tables ADD CONSTRAINT restaurant_tables_zone_length CHECK (zone IS NULL OR char_length(zone) <= 40);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_restaurant_tables_zone ON public.restaurant_tables (business_id, zone);

NOTIFY pgrst, 'reload schema';

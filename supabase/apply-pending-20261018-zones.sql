-- ============================================================================
-- apply-pending-20261018-zones.sql  - run ONCE in the Supabase SQL editor (project: Quad Computing, main).
-- Adds the optional "area" (zone) to tables: Ground floor, First floor, Riverside ... Safe to re-run; nothing is
-- dropped or changed, and until it is run the table screens work exactly as before (areas just are not saved).
-- ============================================================================

-- ###################### 20261018000003_table_zones.sql ######################
ALTER TABLE public.restaurant_tables ADD COLUMN IF NOT EXISTS zone text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_tables_zone_length') THEN
    ALTER TABLE public.restaurant_tables ADD CONSTRAINT restaurant_tables_zone_length CHECK (zone IS NULL OR char_length(zone) <= 40);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_restaurant_tables_zone ON public.restaurant_tables (business_id, zone);

NOTIFY pgrst, 'reload schema';

-- ###################### CHECK (read-only) ######################
SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'restaurant_tables' AND column_name = 'zone';

-- ============================================================================
-- 20261010000006_rooms_realtime.sql   (safe to re-run)
--
-- The front desk is labelled "Live Sync" but rooms were never in Supabase Realtime, so a check-in,
-- checkout or housekeeping change made on one device did not reach another until a reload. This adds
-- rooms and the stay log to the realtime publication. No data or policy changes; the existing row
-- level security still decides who receives which rows.
-- ============================================================================

DO $$
DECLARE
  t text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['rooms', 'room_stay_logs'] LOOP
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t)
         AND NOT EXISTS (
           SELECT 1 FROM pg_publication_tables
           WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
         ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END $$;

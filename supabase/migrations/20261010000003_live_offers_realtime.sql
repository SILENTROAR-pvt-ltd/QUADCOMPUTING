-- ============================================================================
-- 20261010000003_live_offers_realtime.sql   (safe to re-run)
--
-- The live offers table was never added to Supabase Realtime, so a host pausing or publishing an offer
-- did not reach the till or the guest menu until a page reload. This adds the offers and the offer
-- requests to the realtime publication. No data or policy changes.
-- ============================================================================

DO $$
DECLARE
  t text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['venue_live_offers', 'venue_offer_requests'] LOOP
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

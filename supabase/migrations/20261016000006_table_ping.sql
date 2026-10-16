-- Table ping: tell the guests at a table "your bill changed" the moment it does, so phones stop asking every few seconds.
--
-- Guests are anonymous, so row-level security keeps database realtime away from them. Instead, a change to a table's
-- bill, dine-in session or kitchen tickets sends one content-free broadcast on that table's channel
-- (biz_<venue id>_table_<table>, the same name lib/realtime/channels.ts uses). The phone then reads its own order
-- through the normal API. The message carries no data.
--
-- Safe by construction, like 20261016000004_floor_ping.sql: additive only; the trigger never raises, so a failed ping
-- can never fail the write that caused it; and if this database has no realtime.send() nothing is installed.

CREATE OR REPLACE FUNCTION public.table_ping() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  biz text;
  tbl text;
  norm text;
BEGIN
  BEGIN
    IF TG_OP = 'DELETE' THEN
      biz := OLD.business_id::text;
      tbl := COALESCE(to_jsonb(OLD)->>'table_number', to_jsonb(OLD)->>'table_or_room');
    ELSE
      biz := NEW.business_id::text;
      tbl := COALESCE(to_jsonb(NEW)->>'table_number', to_jsonb(NEW)->>'table_or_room');
    END IF;
    IF biz IS NOT NULL AND tbl IS NOT NULL THEN
      -- Same rules as normalizeChannelTable() in lib/realtime/channels.ts.
      norm := regexp_replace(tbl, '\s*\([^)]*\)', '', 'g');
      norm := regexp_replace(norm, '^table\s*', '', 'i');
      norm := regexp_replace(norm, '^t-', '', 'i');
      norm := regexp_replace(upper(btrim(norm)), '[^A-Z0-9-]', '_', 'g');
      IF norm <> '' THEN
        PERFORM realtime.send('{}'::jsonb, 'changed', 'biz_' || lower(biz) || '_table_' || norm, false);
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- a ping is a courtesy; it must never fail the write that caused it
  END;
  RETURN NULL;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  IF to_regprocedure('realtime.send(jsonb,text,text,boolean)') IS NULL THEN
    RAISE NOTICE 'realtime.send() is not available here: table ping not installed (guest phones keep polling).';
    RETURN;
  END IF;

  FOREACH t IN ARRAY ARRAY['orders', 'dine_in_sessions', 'kitchen_tickets'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'business_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name IN ('table_number', 'table_or_room')) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_table_ping ON public.%I', t);
      EXECUTE format('CREATE TRIGGER trg_table_ping AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.table_ping()', t);
    ELSE
      RAISE NOTICE 'Skipping %: no business_id / table column.', t;
    END IF;
  END LOOP;
END;
$$;

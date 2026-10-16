-- Floor ping: tell a venue's staff phones "something changed" the moment it does, so they stop asking every 4 seconds.
--
-- A staff member signed in by PIN has no database login, so row-level security keeps database realtime away from them.
-- Instead, every change to the rows a terminal shows sends one content-free broadcast on the topic `floor_<business id>`.
-- The message carries no data: the phone re-reads through its own authenticated API calls. Anyone who learns a venue's
-- topic learns only that "there was activity".
--
-- Safe by construction:
--  * additive only; no existing table, column or policy changes;
--  * the trigger never raises, so a failed ping can never fail the order, bill or ticket that caused it;
--  * if this database has no realtime.send(), the migration does nothing (the apps keep polling).

CREATE OR REPLACE FUNCTION public.floor_ping() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  biz text;
BEGIN
  BEGIN
    IF TG_OP = 'DELETE' THEN biz := OLD.business_id::text; ELSE biz := NEW.business_id::text; END IF;
    IF biz IS NOT NULL THEN
      PERFORM realtime.send('{}'::jsonb, 'changed', 'floor_' || lower(biz), false);
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
    RAISE NOTICE 'realtime.send() is not available here: floor ping not installed (apps keep polling).';
    RETURN;
  END IF;

  FOREACH t IN ARRAY ARRAY['orders', 'order_items', 'dine_in_sessions', 'restaurant_tables', 'kitchen_tickets'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'business_id'
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_floor_ping ON public.%I', t);
      EXECUTE format(
        'CREATE TRIGGER trg_floor_ping AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.floor_ping()',
        t
      );
    ELSE
      RAISE NOTICE 'Skipping %: no business_id column.', t;
    END IF;
  END LOOP;
END;
$$;

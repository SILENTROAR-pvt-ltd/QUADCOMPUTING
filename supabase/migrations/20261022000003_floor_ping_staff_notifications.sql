-- Faster floor ping (safe to re-run): guest calls ping too, and a kitchen ticket that changes stage says which one.
--
-- 1. Guest calls. A guest's call for the waiter, the chef or the bill is a staff_notifications row. The owner's screens
--    hear it through database realtime; a staff phone signed in by PIN has no database login and only saw it on its
--    next 15 s read. The floor ping (20261016000004) now goes out for these rows too, so the waiter's and cashier's
--    terminals ring the moment a call is made.
--
-- 2. Ticket stages. On every other change the ping stays empty and the phone reads the change itself. When a kitchen
--    ticket changes stage, the ping now carries that ticket's id and its new stage ({"k": <id>, "s": "READY"}), so the
--    waiter's phone moves the card at once instead of reading the whole kitchen again first (it still reads, to confirm).
--    What this adds to a public topic is a random ticket id and a stage name: no table, dish, amount, name or phone.
--    Anyone who knows a venue's id could already see that there was activity; now they can also see the kitchen's pace.
--
-- Additive; the trigger never raises, so a failed ping can never fail the write that caused it. If realtime.send() is not
-- available here, nothing is installed and the terminals keep polling.

DO $$
BEGIN
  IF to_regprocedure('realtime.send(jsonb,text,text,boolean)') IS NULL THEN
    RAISE NOTICE 'realtime.send() is not available here: floor ping unchanged (apps keep polling).';
    RETURN;
  END IF;

  CREATE OR REPLACE FUNCTION public.floor_ping() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
  DECLARE
    biz text;
    msg jsonb := '{}'::jsonb;
  BEGIN
    BEGIN
      IF TG_OP = 'DELETE' THEN biz := OLD.business_id::text; ELSE biz := NEW.business_id::text; END IF;
      -- Nested on purpose: NEW.status is only read for kitchen_tickets (other tables may not have the column).
      IF TG_TABLE_NAME = 'kitchen_tickets' AND TG_OP = 'UPDATE' THEN
        IF NEW.status IS DISTINCT FROM OLD.status THEN
          msg := jsonb_build_object('k', NEW.id::text, 's', NEW.status::text);
        END IF;
      END IF;
      IF biz IS NOT NULL THEN
        PERFORM realtime.send(msg, 'changed', 'floor_' || lower(biz), false);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- a ping is a courtesy; it must never fail the write that caused it
    END;
    RETURN NULL;
  END;
  $fn$;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff_notifications' AND column_name = 'business_id'
  ) THEN
    DROP TRIGGER IF EXISTS trg_floor_ping ON public.staff_notifications;
    CREATE TRIGGER trg_floor_ping
      AFTER INSERT OR UPDATE OR DELETE ON public.staff_notifications
      FOR EACH ROW EXECUTE FUNCTION public.floor_ping();
  ELSE
    RAISE NOTICE 'Skipping staff_notifications: no business_id column.';
  END IF;
END;
$$;

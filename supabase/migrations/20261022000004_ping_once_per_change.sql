-- One push per change, not one per row (safe to re-run).
--
-- Measured on 22 October: one guest order writes about five rows (the order, its lines, the kitchen ticket, the session,
-- the table), and the floor ping and the table ping each fired once per row. Twelve tables ordering at once sent 732
-- floor pushes, enough to approach Supabase Realtime's message rate, and one table's push was lost: its screens waited
-- for their safety read.
--
-- Now each database transaction sends at most one empty push per channel. The first row a transaction changes sends it;
-- the rest of that transaction stays quiet. The push is delivered when the transaction commits, so a screen that reads
-- on it sees every row the transaction wrote. A kitchen ticket that changes stage still always sends its own push
-- naming the ticket and the stage (20261022000003), so the waiter's ready bar moves without a read.
--
-- The guard is a transaction-local setting (set_config(..., true)); it disappears when the transaction ends. Nothing
-- else changes: same triggers, same topics, same payloads. The functions never raise, so a failed push can never fail
-- the write that caused it.

DO $$
BEGIN
  IF to_regprocedure('realtime.send(jsonb,text,text,boolean)') IS NULL THEN
    RAISE NOTICE 'realtime.send() is not available here: pings unchanged.';
    RETURN;
  END IF;

  -- The venue's floor ping (kitchen, waiter and cashier terminals).
  CREATE OR REPLACE FUNCTION public.floor_ping() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
  DECLARE
    biz text;
    topic text;
    flag text;
    msg jsonb := '{}'::jsonb;
  BEGIN
    BEGIN
      IF TG_OP = 'DELETE' THEN biz := OLD.business_id::text; ELSE biz := NEW.business_id::text; END IF;
      IF biz IS NULL THEN RETURN NULL; END IF;
      topic := 'floor_' || lower(biz);
      flag := 'qc_ping.f_' || md5(topic);
      -- Nested on purpose: NEW.status is only read for kitchen_tickets (other tables may not have the column).
      IF TG_TABLE_NAME = 'kitchen_tickets' AND TG_OP = 'UPDATE' THEN
        IF NEW.status IS DISTINCT FROM OLD.status THEN
          msg := jsonb_build_object('k', NEW.id::text, 's', NEW.status::text);
        END IF;
      END IF;
      -- An empty push is sent once per transaction; a ticket's stage is always sent.
      IF msg = '{}'::jsonb AND coalesce(current_setting(flag, true), '') = '1' THEN RETURN NULL; END IF;
      PERFORM set_config(flag, '1', true);
      PERFORM realtime.send(msg, 'changed', topic, false);
    EXCEPTION WHEN OTHERS THEN
      NULL; -- a ping is a courtesy; it must never fail the write that caused it
    END;
    RETURN NULL;
  END;
  $fn$;

  -- Each table's own channel (the guest's phone).
  CREATE OR REPLACE FUNCTION public.table_ping() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
  DECLARE
    biz text;
    tbl text;
    norm text;
    topic text;
    flag text;
  BEGIN
    BEGIN
      IF TG_OP = 'DELETE' THEN
        biz := OLD.business_id::text;
        tbl := COALESCE(to_jsonb(OLD)->>'table_number', to_jsonb(OLD)->>'table_or_room');
      ELSE
        biz := NEW.business_id::text;
        tbl := COALESCE(to_jsonb(NEW)->>'table_number', to_jsonb(NEW)->>'table_or_room');
      END IF;
      IF biz IS NULL OR tbl IS NULL THEN RETURN NULL; END IF;
      -- Same rules as normalizeChannelTable() in lib/realtime/channels.ts.
      norm := regexp_replace(tbl, '\s*\([^)]*\)', '', 'g');
      norm := regexp_replace(norm, '^table\s*', '', 'i');
      norm := regexp_replace(norm, '^t-', '', 'i');
      norm := regexp_replace(upper(btrim(norm)), '[^A-Z0-9-]', '_', 'g');
      IF norm = '' THEN RETURN NULL; END IF;
      topic := 'biz_' || lower(biz) || '_table_' || norm;
      flag := 'qc_ping.t_' || md5(topic);
      IF coalesce(current_setting(flag, true), '') = '1' THEN RETURN NULL; END IF;
      PERFORM set_config(flag, '1', true);
      PERFORM realtime.send('{}'::jsonb, 'changed', topic, false);
    EXCEPTION WHEN OTHERS THEN
      NULL; -- a ping is a courtesy; it must never fail the write that caused it
    END;
    RETURN NULL;
  END;
  $fn$;
END;
$$;

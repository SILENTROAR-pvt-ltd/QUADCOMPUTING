-- My Guests counts the rooms as well as the kitchen.
--
-- Stay bills (the advance before check-in, a payment during the stay, the invoice at checkout) are now recorded as
-- visits when they settle (lib/services/live-events/stay-visit.ts). The ones settled before that were never recorded,
-- so a guest's stays were missing from their visits and spend, and from the dashboard's guest figures. This records
-- every settled bill not yet in the ledger, stay bills included. ledger_record_visit() skips a bill already recorded,
-- so running it twice counts nothing twice. Safe to re-run.

DO $$
DECLARE
  o record;
  j jsonb;
  v_handle text; v_phone text; v_name text; v_display text; v_key text; v_spend numeric; v_biz uuid; v_at timestamptz;
BEGIN
  IF to_regprocedure('public.ledger_record_visit(uuid, uuid, text, text, text, text, text, numeric, timestamptz)') IS NULL THEN
    RAISE NOTICE 'ledger_record_visit() is not installed (apply 20261016000010_ledger_visits.sql first); nothing backfilled.';
    RETURN;
  END IF;

  FOR o IN
    SELECT ord.* FROM public.orders ord
    WHERE lower(COALESCE(ord.status, '')) = 'settled'
      AND NOT EXISTS (SELECT 1 FROM public.ledger_visits v WHERE v.order_id = ord.id)
  LOOP
    j := to_jsonb(o);
    v_biz := NULLIF(j->>'business_id', '')::uuid;
    CONTINUE WHEN v_biz IS NULL;

    v_handle := lower(btrim(COALESCE(j->>'guest_handle', '')));
    v_phone := regexp_replace(COALESCE(j->>'customer_phone', ''), '\D', '', 'g');
    IF length(v_phone) >= 10 THEN v_phone := right(v_phone, 10); ELSE v_phone := ''; END IF;
    v_display := btrim(COALESCE(j->>'customer_name', ''));
    v_name := regexp_replace(lower(v_display), '\s+', ' ', 'g');
    IF v_name IN ('', 'guest', 'walk-in guest', 'walk in guest', 'customer', 'in-house guest') THEN v_name := ''; END IF;
    v_spend := COALESCE(NULLIF(j->>'grand_total', '')::numeric, 0);
    v_at := COALESCE(NULLIF(j->>'updated_at', '')::timestamptz, NULLIF(j->>'created_at', '')::timestamptz, now());

    IF v_handle <> '' THEN
      v_key := 'h:' || CASE WHEN left(v_handle, 1) = '@' THEN v_handle ELSE '@' || v_handle END;
    ELSIF v_phone <> '' THEN
      v_key := 'p:' || v_phone;
    ELSIF v_name <> '' THEN
      v_key := 'n:' || v_name;
    ELSE
      v_key := 'o:' || o.id::text;
    END IF;

    PERFORM public.ledger_record_visit(
      v_biz, o.id, v_key,
      COALESCE(NULLIF(v_display, ''), 'Walk-in guest'),
      CASE WHEN v_handle <> '' THEN CASE WHEN left(v_handle, 1) = '@' THEN v_handle ELSE '@' || v_handle END END,
      NULL,
      CASE WHEN v_phone <> '' THEN v_phone END,
      v_spend, v_at
    );
  END LOOP;
END;
$$;

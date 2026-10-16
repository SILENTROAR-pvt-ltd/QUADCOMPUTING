-- ============================================================================
-- 20261016000010_ledger_visits.sql   (safe to re-run)
--
-- My Guests must record EVERY guest who paid, not only signed-in guests with a phone number:
--   * one visit per settled bill, recorded once (a repeated settle or a retry cannot count twice);
--   * a walk-in with only a name is one guest per name at the venue; a walk-in with no name is one guest per bill.
--   * the bill's own date is kept, so "last visit" is when they paid, not when the ledger was updated.
-- Also backfills every bill already settled, so the ledger starts with the history that exists.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ledger_visits (
  order_id     uuid PRIMARY KEY,
  business_id  uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  guest_key    text NOT NULL,
  spend        numeric(12,2) NOT NULL DEFAULT 0 CHECK (spend >= 0),
  visited_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_visits_guest ON public.ledger_visits (business_id, guest_key, visited_at DESC);
ALTER TABLE public.ledger_visits ENABLE ROW LEVEL SECURITY;

DROP FUNCTION IF EXISTS public.ledger_record_visit(uuid, text, text, text, text, text, numeric);

-- Records one settled bill for a guest. Returns false when this bill was already recorded.
CREATE OR REPLACE FUNCTION public.ledger_record_visit(
  p_business_id uuid, p_order_id uuid, p_guest_key text, p_guest_name text, p_handle text, p_email text, p_phone text,
  p_spend numeric, p_at timestamptz DEFAULT now()
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rows integer;
  v_spend numeric := GREATEST(COALESCE(p_spend, 0), 0);
  v_at timestamptz := COALESCE(p_at, now());
BEGIN
  INSERT INTO public.ledger_visits (order_id, business_id, guest_key, spend, visited_at)
  VALUES (p_order_id, p_business_id, p_guest_key, v_spend, v_at)
  ON CONFLICT (order_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN false; END IF;

  INSERT INTO public.venue_guest_ledger AS g (business_id, guest_key, guest_name, vibers_handle, email, phone, visits, total_spend, last_visit_at)
  VALUES (p_business_id, p_guest_key, COALESCE(NULLIF(p_guest_name, ''), 'Walk-in guest'), p_handle, p_email, p_phone, 1, v_spend, v_at)
  ON CONFLICT (business_id, guest_key) DO UPDATE SET
    visits        = g.visits + 1,
    total_spend   = g.total_spend + EXCLUDED.total_spend,
    last_visit_at = GREATEST(COALESCE(g.last_visit_at, EXCLUDED.last_visit_at), EXCLUDED.last_visit_at),
    guest_name    = COALESCE(NULLIF(p_guest_name, ''), g.guest_name),
    vibers_handle = COALESCE(p_handle, g.vibers_handle),
    email         = COALESCE(p_email, g.email),
    phone         = COALESCE(p_phone, g.phone),
    updated_at    = now();
  RETURN true;
END;
$$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.ledger_record_visit(uuid, uuid, text, text, text, text, text, numeric, timestamptz) FROM public, anon, authenticated;
  GRANT  EXECUTE ON FUNCTION public.ledger_record_visit(uuid, uuid, text, text, text, text, text, numeric, timestamptz) TO service_role;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Backfill: every bill already settled. The key matches lib/services/live-events/guest-key.ts:
-- Vibers handle, then phone (last ten digits), then name, then the bill itself for an unnamed walk-in.
-- Columns are read through to_jsonb so this runs whether or not an older orders column exists.
DO $$
DECLARE
  o record;
  j jsonb;
  v_handle text; v_phone text; v_name text; v_display text; v_key text; v_spend numeric; v_biz uuid; v_at timestamptz;
BEGIN
  FOR o IN SELECT * FROM public.orders WHERE lower(COALESCE(status, '')) = 'settled' LOOP
    j := to_jsonb(o);
    v_biz := NULLIF(j->>'business_id', '')::uuid;
    CONTINUE WHEN v_biz IS NULL;

    v_handle := lower(btrim(COALESCE(j->>'guest_handle', '')));
    v_phone := regexp_replace(COALESCE(j->>'customer_phone', ''), '\D', '', 'g');
    IF length(v_phone) >= 10 THEN v_phone := right(v_phone, 10); ELSE v_phone := ''; END IF;
    v_display := btrim(COALESCE(j->>'customer_name', ''));
    v_name := regexp_replace(lower(v_display), '\s+', ' ', 'g');
    IF v_name IN ('', 'guest', 'walk-in guest') THEN v_name := ''; END IF;
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

NOTIFY pgrst, 'reload schema';

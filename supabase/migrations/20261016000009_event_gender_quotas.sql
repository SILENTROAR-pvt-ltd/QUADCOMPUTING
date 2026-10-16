-- ============================================================================
-- 20261016000009_event_gender_quotas.sql   (safe to re-run, additive only)
--
-- A host sets a guest pool for an event (capacity) and, if they wish, how many of those seats are for men and for women.
-- This replaces the earlier "highest share of men" percent, which is no longer written (max_male_pct stays in place,
-- unused, so nothing is dropped). A party that would not fit a gender's seats is refused with the seats left, instead of
-- being held for approval.
--   male_capacity / female_capacity  NULL = no limit for that gender. Together they never exceed the pool.
-- ============================================================================

ALTER TABLE public.venue_live_events ADD COLUMN IF NOT EXISTS male_capacity integer CHECK (male_capacity IS NULL OR male_capacity >= 0);
ALTER TABLE public.venue_live_events ADD COLUMN IF NOT EXISTS female_capacity integer CHECK (female_capacity IS NULL OR female_capacity >= 0);

DO $$ BEGIN
  ALTER TABLE public.venue_live_events ADD CONSTRAINT venue_live_events_split_fits_pool
    CHECK (
      (male_capacity IS NULL AND female_capacity IS NULL)
      OR (capacity IS NOT NULL AND COALESCE(male_capacity, 0) + COALESCE(female_capacity, 0) <= capacity)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- The seat check is made again inside the database, under a lock on the event, so two parties booking the last seats
-- at the same moment cannot both get them. Same signature as before (p_ratio_ok is kept for compatibility and ignored).
CREATE OR REPLACE FUNCTION public.record_event_interest(
  p_business_id uuid, p_event_id uuid, p_guest_key text, p_guest_name text, p_handle text, p_email text, p_phone text,
  p_party_male integer, p_party_female integer, p_party_other integer, p_ratio_ok boolean
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_size integer := p_party_male + p_party_female + p_party_other;
  v_ev public.venue_live_events;
  v_total integer; v_men integer; v_women integer;
  v_new boolean; v_id uuid; v_status text;
BEGIN
  SELECT * INTO v_ev FROM public.venue_live_events WHERE id = p_event_id AND business_id = p_business_id FOR UPDATE;
  IF NOT FOUND OR v_ev.status <> 'LIVE' THEN RAISE EXCEPTION 'EVENT_CLOSED'; END IF;

  SELECT COALESCE(SUM(party_size), 0), COALESCE(SUM(party_male), 0), COALESCE(SUM(party_female), 0)
    INTO v_total, v_men, v_women
  FROM public.event_guest_leads WHERE event_id = p_event_id AND status <> 'DECLINED' AND guest_key <> p_guest_key;

  IF v_ev.capacity IS NOT NULL AND v_total + v_size > v_ev.capacity THEN RAISE EXCEPTION 'EVENT_FULL'; END IF;
  IF v_ev.male_capacity IS NOT NULL AND v_men + p_party_male > v_ev.male_capacity THEN RAISE EXCEPTION 'EVENT_FULL_MEN'; END IF;
  IF v_ev.female_capacity IS NOT NULL AND v_women + p_party_female > v_ev.female_capacity THEN RAISE EXCEPTION 'EVENT_FULL_WOMEN'; END IF;

  INSERT INTO public.event_guest_leads AS l (business_id, event_id, guest_key, guest_name, vibers_handle, email, phone,
                                            party_size, party_male, party_female, party_other, ratio_ok)
  VALUES (p_business_id, p_event_id, p_guest_key, p_guest_name, p_handle, p_email, p_phone,
          v_size, p_party_male, p_party_female, p_party_other, true)
  ON CONFLICT (event_id, guest_key) DO UPDATE SET
    guest_name = EXCLUDED.guest_name, vibers_handle = COALESCE(EXCLUDED.vibers_handle, l.vibers_handle),
    email = COALESCE(EXCLUDED.email, l.email), phone = COALESCE(EXCLUDED.phone, l.phone),
    party_size = EXCLUDED.party_size, party_male = EXCLUDED.party_male, party_female = EXCLUDED.party_female,
    party_other = EXCLUDED.party_other, ratio_ok = true,
    status = CASE WHEN l.status = 'DECLINED' THEN 'INTERESTED' ELSE l.status END,
    updated_at = now()
  RETURNING l.id, l.status, (xmax = 0) INTO v_id, v_status, v_new;

  INSERT INTO public.venue_guest_ledger AS g (business_id, guest_key, guest_name, vibers_handle, email, phone, event_leads)
  VALUES (p_business_id, p_guest_key, p_guest_name, p_handle, p_email, p_phone, 1)
  ON CONFLICT (business_id, guest_key) DO UPDATE SET
    event_leads   = g.event_leads + CASE WHEN v_new THEN 1 ELSE 0 END,
    guest_name    = COALESCE(NULLIF(p_guest_name, ''), g.guest_name),
    vibers_handle = COALESCE(p_handle, g.vibers_handle),
    email         = COALESCE(p_email, g.email),
    phone         = COALESCE(p_phone, g.phone),
    updated_at    = now();

  RETURN jsonb_build_object('lead_id', v_id, 'status', v_status, 'created', v_new);
END;
$$;

NOTIFY pgrst, 'reload schema';

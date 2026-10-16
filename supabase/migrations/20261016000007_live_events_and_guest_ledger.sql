-- ============================================================================
-- 20261016000007_live_events_and_guest_ledger.sql   (safe to re-run, additive only)
--
-- Live Events pipeline and "My Guests":
--   venue_live_events   a structured event the venue publishes (banner, date, fee, perks, entry rules)
--   event_guest_leads   a guest's "I'm Interested" (who, party size and its gender mix, status)
--   venue_guest_ledger  one row per known guest per venue: visits, spend, event leads
--
-- Row-level security is ON with no policies: nothing here is readable or writable from a browser's own key. Every read
-- and write goes through the API, which scopes it to the signed-in host's venue or to the guest's own session.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.venue_live_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title         text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  description   text,
  banner_url    text,
  category      text NOT NULL DEFAULT 'Live Event',
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz,
  entry_fee     numeric(10,2) NOT NULL DEFAULT 0 CHECK (entry_fee >= 0),
  perks         text[] NOT NULL DEFAULT '{}',
  capacity      integer CHECK (capacity IS NULL OR capacity > 0),
  -- Highest share of men in a party (percent). NULL = no rule. A party over it is held for the venue's approval.
  max_male_pct  integer CHECK (max_male_pct IS NULL OR max_male_pct BETWEEN 0 AND 100),
  status        text NOT NULL DEFAULT 'LIVE' CHECK (status IN ('DRAFT', 'LIVE', 'CANCELLED')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_live_events_venue_start ON public.venue_live_events (business_id, starts_at DESC);

CREATE TABLE IF NOT EXISTS public.event_guest_leads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_id      uuid NOT NULL REFERENCES public.venue_live_events(id) ON DELETE CASCADE,
  guest_key     text NOT NULL,
  guest_name    text NOT NULL,
  vibers_handle text,
  email         text,
  phone         text,
  party_size    integer NOT NULL CHECK (party_size BETWEEN 1 AND 10),
  party_male    integer NOT NULL DEFAULT 0 CHECK (party_male >= 0),
  party_female  integer NOT NULL DEFAULT 0 CHECK (party_female >= 0),
  party_other   integer NOT NULL DEFAULT 0 CHECK (party_other >= 0),
  ratio_ok      boolean NOT NULL DEFAULT true,
  status        text NOT NULL DEFAULT 'INTERESTED' CHECK (status IN ('INTERESTED', 'CONFIRMED', 'DECLINED')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_guest_leads_party_adds_up CHECK (party_male + party_female + party_other = party_size),
  CONSTRAINT event_guest_leads_one_per_guest UNIQUE (event_id, guest_key)
);
CREATE INDEX IF NOT EXISTS idx_event_leads_event ON public.event_guest_leads (event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_leads_venue ON public.event_guest_leads (business_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.venue_guest_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  guest_key     text NOT NULL,
  guest_name    text NOT NULL,
  vibers_handle text,
  email         text,
  phone         text,
  visits        integer NOT NULL DEFAULT 0 CHECK (visits >= 0),
  total_spend   numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_spend >= 0),
  event_leads   integer NOT NULL DEFAULT 0 CHECK (event_leads >= 0),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_visit_at timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_guest_ledger_one_per_guest UNIQUE (business_id, guest_key)
);
CREATE INDEX IF NOT EXISTS idx_guest_ledger_venue_visit ON public.venue_guest_ledger (business_id, last_visit_at DESC NULLS LAST);

ALTER TABLE public.venue_live_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_guest_leads  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_guest_ledger ENABLE ROW LEVEL SECURITY;

-- Adds one visit and its spend to a guest's ledger row, atomically (two bills settled together both count).
CREATE OR REPLACE FUNCTION public.ledger_record_visit(
  p_business_id uuid, p_guest_key text, p_guest_name text, p_handle text, p_email text, p_phone text, p_spend numeric
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.venue_guest_ledger AS g (business_id, guest_key, guest_name, vibers_handle, email, phone, visits, total_spend, last_visit_at)
  VALUES (p_business_id, p_guest_key, p_guest_name, p_handle, p_email, p_phone, 1, GREATEST(p_spend, 0), now())
  ON CONFLICT (business_id, guest_key) DO UPDATE SET
    visits        = g.visits + 1,
    total_spend   = g.total_spend + GREATEST(p_spend, 0),
    last_visit_at = now(),
    guest_name    = COALESCE(NULLIF(p_guest_name, ''), g.guest_name),
    vibers_handle = COALESCE(p_handle, g.vibers_handle),
    email         = COALESCE(p_email, g.email),
    phone         = COALESCE(p_phone, g.phone),
    updated_at    = now();
$$;

-- Records a guest's interest in an event: the lead, and the ledger row (created if new, event count raised once per event).
CREATE OR REPLACE FUNCTION public.record_event_interest(
  p_business_id uuid, p_event_id uuid, p_guest_key text, p_guest_name text, p_handle text, p_email text, p_phone text,
  p_party_male integer, p_party_female integer, p_party_other integer, p_ratio_ok boolean
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_size integer := p_party_male + p_party_female + p_party_other;
  v_new boolean;
  v_id uuid;
  v_status text;
BEGIN
  INSERT INTO public.event_guest_leads AS l (business_id, event_id, guest_key, guest_name, vibers_handle, email, phone,
                                            party_size, party_male, party_female, party_other, ratio_ok)
  VALUES (p_business_id, p_event_id, p_guest_key, p_guest_name, p_handle, p_email, p_phone,
          v_size, p_party_male, p_party_female, p_party_other, p_ratio_ok)
  ON CONFLICT (event_id, guest_key) DO UPDATE SET
    guest_name = EXCLUDED.guest_name, vibers_handle = COALESCE(EXCLUDED.vibers_handle, l.vibers_handle),
    email = COALESCE(EXCLUDED.email, l.email), phone = COALESCE(EXCLUDED.phone, l.phone),
    party_size = EXCLUDED.party_size, party_male = EXCLUDED.party_male, party_female = EXCLUDED.party_female,
    party_other = EXCLUDED.party_other, ratio_ok = EXCLUDED.ratio_ok,
    status = CASE WHEN l.status = 'CONFIRMED' AND EXCLUDED.ratio_ok THEN l.status ELSE 'INTERESTED' END,
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

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.ledger_record_visit(uuid, text, text, text, text, text, numeric) FROM public, anon, authenticated;
  GRANT  EXECUTE ON FUNCTION public.ledger_record_visit(uuid, text, text, text, text, text, numeric) TO service_role;
  REVOKE EXECUTE ON FUNCTION public.record_event_interest(uuid, uuid, text, text, text, text, text, integer, integer, integer, boolean) FROM public, anon, authenticated;
  GRANT  EXECUTE ON FUNCTION public.record_event_interest(uuid, uuid, text, text, text, text, text, integer, integer, integer, boolean) TO service_role;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';

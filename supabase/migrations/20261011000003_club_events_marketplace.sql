-- Vibers Club, part 3: events and tours, consent records, interest and participants, the property
-- marketplace, offers and agreements. Money is integer paise. Server-only tables. Idempotent.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.viber_profiles') IS NULL OR to_regclass('public.club_rooms') IS NULL THEN
        RAISE EXCEPTION 'Run 20261011000001_club_identity.sql and 20261011000002_club_social.sql first (or paste supabase/club_setup_all.sql, which runs all four in order).';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.club_consent_versions (
    version integer PRIMARY KEY,
    body text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.club_consent_versions (version, body) VALUES (1,
'I organise this plan myself and am responsible for it. I have described transport, stays, food, activities, costs, cancellation and safety honestly. I will brief every participant on the safety protocol, follow the law and the house rules of every property, and keep the group''s money only in the Vibers Club escrow. Vibers Club may pause or cancel the plan if these terms are broken.')
ON CONFLICT (version) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.club_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid NOT NULL REFERENCES public.viber_profiles(user_id) ON DELETE RESTRICT,
    title text NOT NULL CHECK (length(title) BETWEEN 4 AND 120),
    kind text NOT NULL CHECK (kind IN ('tour', 'event', 'short_plan')),
    cover_paths text[] NOT NULL DEFAULT '{}',
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    venue text,
    transport text,
    food text,
    activities text,
    budget jsonb NOT NULL DEFAULT '[]',
    cancellation_policy text NOT NULL,
    safety_protocol text NOT NULL,
    price_min bigint NOT NULL CHECK (price_min >= 0),
    price_max bigint NOT NULL,
    capacity integer NOT NULL CHECK (capacity BETWEEN 1 AND 5000),
    ticket_price bigint NOT NULL DEFAULT 0 CHECK (ticket_price >= 0),
    payment_schedule jsonb NOT NULL DEFAULT '[{"label":"Full payment","bps":10000}]',
    fee_bps integer CHECK (fee_bps BETWEEN 0 AND 5000),
    status text NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'cancelled', 'completed')),
    verified boolean NOT NULL DEFAULT false,
    verified_at timestamptz,
    review_note text,
    reviewed_by uuid,
    reviewed_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT club_events_dates CHECK (ends_at > starts_at),
    CONSTRAINT club_events_price_range CHECK (price_max >= price_min)
);
CREATE INDEX IF NOT EXISTS idx_club_events_status ON public.club_events (status, starts_at);
CREATE INDEX IF NOT EXISTS idx_club_events_creator ON public.club_events (creator_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'club_rooms_event_fk') THEN
        ALTER TABLE public.club_rooms ADD CONSTRAINT club_rooms_event_fk
            FOREIGN KEY (event_id) REFERENCES public.club_events(id) ON DELETE CASCADE;
    END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_club_rooms_event ON public.club_rooms (event_id) WHERE event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.club_event_consents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.club_events(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.viber_profiles(user_id) ON DELETE RESTRICT,
    viber_id text NOT NULL,
    version integer NOT NULL REFERENCES public.club_consent_versions(version),
    ip text NOT NULL,
    user_agent text,
    signed_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (event_id, version)
);

CREATE TABLE IF NOT EXISTS public.club_event_interest (
    event_id uuid NOT NULL REFERENCES public.club_events(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.viber_profiles(user_id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.club_event_participants (
    event_id uuid NOT NULL REFERENCES public.club_events(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.viber_profiles(user_id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'confirmed', 'cancelled')),
    total_due bigint NOT NULL CHECK (total_due >= 0),
    paid bigint NOT NULL DEFAULT 0 CHECK (paid >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.property_marketplace (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES public.viber_profiles(user_id) ON DELETE RESTRICT,
    -- The owner's own QC venue, when they link one. Read-only from the Club side.
    business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
    name text NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
    categories text[] NOT NULL DEFAULT '{}',
    description text,
    capacity integer NOT NULL CHECK (capacity BETWEEN 1 AND 10000),
    photo_paths text[] NOT NULL DEFAULT '{}',
    price_min bigint NOT NULL CHECK (price_min >= 0),
    price_max bigint NOT NULL,
    amenities text[] NOT NULL DEFAULT '{}',
    lat numeric(9, 6),
    lng numeric(9, 6),
    address text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    country text NOT NULL DEFAULT 'India',
    house_rules text,
    terms text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'suspended')),
    review_note text,
    verified_by uuid,
    verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT property_marketplace_price_range CHECK (price_max >= price_min)
);
CREATE INDEX IF NOT EXISTS idx_property_marketplace_search ON public.property_marketplace (status, city);

CREATE TABLE IF NOT EXISTS public.club_offers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.club_events(id) ON DELETE CASCADE,
    property_id uuid NOT NULL REFERENCES public.property_marketplace(id) ON DELETE CASCADE,
    creator_id uuid NOT NULL REFERENCES public.viber_profiles(user_id),
    owner_id uuid NOT NULL REFERENCES public.viber_profiles(user_id),
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'countered', 'accepted', 'rejected', 'withdrawn')),
    rate bigint NOT NULL CHECK (rate > 0),
    guests integer NOT NULL CHECK (guests BETWEEN 1 AND 10000),
    check_in date NOT NULL,
    check_out date NOT NULL,
    add_ons jsonb NOT NULL DEFAULT '[]',
    last_actor uuid NOT NULL,
    version integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT club_offers_dates CHECK (check_out >= check_in)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_club_offers_live ON public.club_offers (event_id, property_id)
    WHERE status IN ('open', 'countered', 'accepted');

CREATE TABLE IF NOT EXISTS public.club_offer_revisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id uuid NOT NULL REFERENCES public.club_offers(id) ON DELETE CASCADE,
    actor_id uuid NOT NULL,
    action text NOT NULL CHECK (action IN ('offer', 'counter', 'accept', 'reject', 'withdraw')),
    rate bigint,
    guests integer,
    check_in date,
    check_out date,
    add_ons jsonb,
    note text CHECK (length(note) <= 1000),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_offer_revisions_offer ON public.club_offer_revisions (offer_id, created_at);

CREATE TABLE IF NOT EXISTS public.club_agreements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id uuid NOT NULL UNIQUE REFERENCES public.club_offers(id) ON DELETE RESTRICT,
    event_id uuid NOT NULL REFERENCES public.club_events(id) ON DELETE RESTRICT,
    property_id uuid NOT NULL REFERENCES public.property_marketplace(id) ON DELETE RESTRICT,
    creator_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    invoice_number text NOT NULL UNIQUE,
    items jsonb NOT NULL,
    total bigint NOT NULL CHECK (total > 0),
    deposit_amount bigint NOT NULL CHECK (deposit_amount > 0),
    status text NOT NULL DEFAULT 'awaiting_deposit' CHECK (status IN ('awaiting_deposit', 'deposit_paid', 'cancelled')),
    locked_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['club_consent_versions', 'club_events', 'club_event_consents', 'club_event_interest',
        'club_event_participants', 'property_marketplace', 'club_offers', 'club_offer_revisions', 'club_agreements'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    END LOOP;
END $$;

COMMIT;

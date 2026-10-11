-- Vibers Club: complete database setup in one paste (Supabase → SQL Editor → Run).
-- Generated from supabase/migrations/2026101100000{1..4}_club_*.sql; do not edit by hand.
-- Safe to run more than once. It only creates Club tables (and the shared vibers_accounts table if it
-- is missing); Quad Computing tables are not changed.

-- ===== 20261011000001_club_identity.sql =====
-- Vibers Club, part 1: identity, membership applications, staff, campaigns, OTP and presence.
--
-- Club tables are new and separate from Quad Computing. The only link to QC is identity: a Viber is a
-- Supabase user (auth.users) with a Vibers account (vibers_accounts, migration 20261010000019), and the
-- Viber ID is that account's @handle. A composite foreign key keeps the two in sync.
-- Every table is server-only: RLS on, no grants to anon/authenticated. Idempotent.

BEGIN;

-- The shared Vibers identity table normally comes from QC migration 20261010000019. Create it here
-- too (same definition, only if missing) so the Club can be set up even if that one was skipped.
CREATE TABLE IF NOT EXISTS public.vibers_accounts (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    handle text NOT NULL,
    display_name text NOT NULL,
    phone text,
    avatar text NOT NULL DEFAULT '☕',
    traveller_type text,
    intro text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT vibers_accounts_handle_format CHECK (handle ~ '^@[a-z0-9_]{2,30}$'),
    CONSTRAINT vibers_accounts_unique_handle UNIQUE (handle)
);
ALTER TABLE public.vibers_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vibers_accounts FROM anon, authenticated;

-- Lets viber_profiles reference (user_id, handle) together. user_id is already the primary key, so
-- this index is unique by construction and changes nothing for QC.
CREATE UNIQUE INDEX IF NOT EXISTS uq_vibers_accounts_user_handle ON public.vibers_accounts (user_id, handle);

CREATE TABLE IF NOT EXISTS public.club_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.club_settings (key, value) VALUES
    ('platform_fee_bps', '1000'),
    ('deposit_bps', '1000'),
    ('payout_requires_approval', 'true')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.club_staff (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('club_admin', 'super_admin')),
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9_]{2,30}$'),
    label text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    sort integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.business_categories (slug, label, sort) VALUES
    ('hotel', 'Hotel', 1), ('cafe', 'Cafe', 2), ('restaurant', 'Restaurant', 3)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.viber_profiles (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    viber_id text NOT NULL UNIQUE,
    alias text,
    alias_masked boolean NOT NULL DEFAULT false,
    dob date NOT NULL,
    generation text NOT NULL CHECK (generation IN ('gen_alpha', 'gen_z', 'millennial', 'gen_x', 'boomer')),
    city text NOT NULL,
    state text NOT NULL,
    country text NOT NULL,
    account_type text NOT NULL CHECK (account_type IN ('viber', 'business')),
    business_name text,
    phone text NOT NULL,
    phone_verified_at timestamptz NOT NULL,
    vibe_line text,
    avatar_url text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
    pass_number text UNIQUE,
    campaign_source text,
    review_note text,
    reviewed_by uuid,
    reviewed_at timestamptz,
    muted_until timestamptz,
    shadow_banned boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT viber_profiles_identity_fk FOREIGN KEY (user_id, viber_id)
        REFERENCES public.vibers_accounts (user_id, handle) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT viber_profiles_business_name CHECK (account_type = 'viber' OR length(coalesce(business_name, '')) > 0)
);
CREATE INDEX IF NOT EXISTS idx_viber_profiles_status ON public.viber_profiles (status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_viber_profiles_alias ON public.viber_profiles (lower(alias)) WHERE alias IS NOT NULL;

-- 18+ only, checked by the database as well as the app.
CREATE OR REPLACE FUNCTION public.club_enforce_adult() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.dob > (current_date - interval '18 years') THEN
        RAISE EXCEPTION 'Vibers Club members must be 18 or older' USING ERRCODE = 'check_violation';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_viber_profiles_adult ON public.viber_profiles;
CREATE TRIGGER trg_viber_profiles_adult BEFORE INSERT OR UPDATE OF dob ON public.viber_profiles
    FOR EACH ROW EXECUTE FUNCTION public.club_enforce_adult();

CREATE TABLE IF NOT EXISTS public.viber_profile_categories (
    user_id uuid NOT NULL REFERENCES public.viber_profiles(user_id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES public.business_categories(id) ON DELETE RESTRICT,
    PRIMARY KEY (user_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.club_campaigns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9_-]{3,40}$'),
    label text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    rotated_from uuid REFERENCES public.club_campaigns(id) ON DELETE SET NULL,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.club_phone_otps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone text NOT NULL,
    code_hash text NOT NULL,
    attempts integer NOT NULL DEFAULT 0,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_phone_otps_user ON public.club_phone_otps (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.club_presence (
    user_id uuid PRIMARY KEY REFERENCES public.viber_profiles(user_id) ON DELETE CASCADE,
    last_seen timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_presence_seen ON public.club_presence (last_seen DESC);

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['club_settings', 'club_staff', 'business_categories', 'viber_profiles',
        'viber_profile_categories', 'club_campaigns', 'club_phone_otps', 'club_presence'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.club_enforce_adult() FROM PUBLIC, anon, authenticated;

COMMIT;

-- ===== 20261011000002_club_social.sql =====
-- Vibers Club, part 2: chat rooms and messages, reactions, stories, reports, moderation log and
-- notifications, plus the private media bucket. Server-only tables. Idempotent.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.viber_profiles') IS NULL THEN
        RAISE EXCEPTION 'Run 20261011000001_club_identity.sql first (or paste supabase/club_setup_all.sql, which runs all four in order).';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.club_rooms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    kind text NOT NULL CHECK (kind IN ('global', 'dm', 'event')),
    slug text UNIQUE,
    dm_key text UNIQUE,
    event_id uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.club_rooms (kind, slug) VALUES ('global', 'global') ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.club_room_members (
    room_id uuid NOT NULL REFERENCES public.club_rooms(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.viber_profiles(user_id) ON DELETE CASCADE,
    joined_at timestamptz NOT NULL DEFAULT now(),
    last_read_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (room_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_club_room_members_user ON public.club_room_members (user_id);

CREATE TABLE IF NOT EXISTS public.club_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id uuid NOT NULL REFERENCES public.club_rooms(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES public.viber_profiles(user_id) ON DELETE CASCADE,
    body text NOT NULL DEFAULT '' CHECK (length(body) <= 2000),
    image_path text,
    -- Hidden messages are seen only by their sender (shadow-ban) and by staff.
    hidden boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT club_messages_not_empty CHECK (length(body) > 0 OR image_path IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_club_messages_room ON public.club_messages (room_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.club_message_reactions (
    message_id uuid NOT NULL REFERENCES public.club_messages(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.viber_profiles(user_id) ON DELETE CASCADE,
    emoji text NOT NULL CHECK (length(emoji) BETWEEN 1 AND 16),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.club_stories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.viber_profiles(user_id) ON DELETE CASCADE,
    media_path text NOT NULL,
    media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
    caption text CHECK (length(caption) <= 300),
    verified_stay boolean NOT NULL DEFAULT false,
    stay_business_id uuid,
    hidden boolean NOT NULL DEFAULT false,
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_stories_live ON public.club_stories (expires_at DESC);

CREATE TABLE IF NOT EXISTS public.club_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_type text NOT NULL CHECK (target_type IN ('user', 'message', 'story', 'event', 'property')),
    target_id text NOT NULL,
    reason text NOT NULL CHECK (length(reason) BETWEEN 3 AND 500),
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'actioned', 'dismissed')),
    handled_by uuid,
    handled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (reporter_id, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS idx_club_reports_open ON public.club_reports (status, created_at);

CREATE TABLE IF NOT EXISTS public.club_moderation_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid NOT NULL,
    action text NOT NULL,
    target_user_id uuid,
    target_type text,
    target_id text,
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.club_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kind text NOT NULL,
    title text NOT NULL,
    body text,
    link text,
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_notifications_user ON public.club_notifications (user_id, created_at DESC);

-- Private: media is served through short-lived signed URLs to members only.
INSERT INTO storage.buckets (id, name, public) VALUES ('club-media', 'club-media', false)
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['club_rooms', 'club_room_members', 'club_messages', 'club_message_reactions',
        'club_stories', 'club_reports', 'club_moderation_log', 'club_notifications'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    END LOOP;
END $$;

COMMIT;

-- ===== 20261011000003_club_events_marketplace.sql =====
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

-- ===== 20261011000004_club_ledger.sql =====
-- Vibers Club, part 4: the escrow-style double-entry ledger, payments, payouts, webhooks and NOCs.
--
-- Every money movement is one journal (club_journal) with balanced lines (escrow_ledger), posted by
-- club_post_journal() in a single transaction:
--   * debits equal credits, both positive, at least two lines;
--   * the same idempotency key always returns the same journal (no double posting);
--   * liability accounts (event escrow, vendor payables) can never go below zero, checked under a
--     row lock so two payouts cannot spend the same money.
-- Journals and lines are immutable. Amounts are integer paise. Server-only. Idempotent.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.club_events') IS NULL OR to_regclass('public.club_agreements') IS NULL THEN
        RAISE EXCEPTION 'Run Club migrations 20261011000001, 20261011000002 and 20261011000003 first (or paste supabase/club_setup_all.sql, which runs all four in order).';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.club_ledger_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    kind text NOT NULL CHECK (kind IN ('platform_cash', 'event_escrow', 'vendor_payable', 'club_revenue')),
    event_id uuid REFERENCES public.club_events(id) ON DELETE RESTRICT,
    property_id uuid REFERENCES public.property_marketplace(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.club_journal (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key text NOT NULL UNIQUE,
    kind text NOT NULL,
    event_id uuid REFERENCES public.club_events(id) ON DELETE RESTRICT,
    memo text,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_journal_event ON public.club_journal (event_id, created_at);

CREATE TABLE IF NOT EXISTS public.escrow_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_id uuid NOT NULL REFERENCES public.club_journal(id) ON DELETE RESTRICT,
    account_id uuid NOT NULL REFERENCES public.club_ledger_accounts(id) ON DELETE RESTRICT,
    debit bigint NOT NULL DEFAULT 0,
    credit bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT escrow_ledger_one_side CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);
CREATE INDEX IF NOT EXISTS idx_escrow_ledger_account ON public.escrow_ledger (account_id);
CREATE INDEX IF NOT EXISTS idx_escrow_ledger_journal ON public.escrow_ledger (journal_id);

CREATE OR REPLACE FUNCTION public.club_ledger_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'The ledger is append-only: post a reversing journal instead' USING ERRCODE = 'check_violation';
END $$;
DROP TRIGGER IF EXISTS trg_escrow_ledger_immutable ON public.escrow_ledger;
CREATE TRIGGER trg_escrow_ledger_immutable BEFORE UPDATE OR DELETE ON public.escrow_ledger
    FOR EACH ROW EXECUTE FUNCTION public.club_ledger_immutable();
DROP TRIGGER IF EXISTS trg_club_journal_immutable ON public.club_journal;
CREATE TRIGGER trg_club_journal_immutable BEFORE UPDATE OR DELETE ON public.club_journal
    FOR EACH ROW EXECUTE FUNCTION public.club_ledger_immutable();

CREATE OR REPLACE FUNCTION public.club_post_journal(
    p_key text, p_kind text, p_event uuid, p_memo text, p_actor uuid, p_lines jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_id uuid;
    v_lines integer;
    v_dr bigint;
    v_cr bigint;
    v_bad text;
BEGIN
    SELECT id INTO v_id FROM club_journal WHERE idempotency_key = p_key;
    IF FOUND THEN RETURN v_id; END IF;

    SELECT count(*), coalesce(sum(coalesce((l->>'debit')::bigint, 0)), 0), coalesce(sum(coalesce((l->>'credit')::bigint, 0)), 0)
      INTO v_lines, v_dr, v_cr FROM jsonb_array_elements(p_lines) l;
    IF v_lines < 2 OR v_dr <> v_cr OR v_dr <= 0 THEN
        RAISE EXCEPTION 'Unbalanced journal (% lines, debit %, credit %)', v_lines, v_dr, v_cr USING ERRCODE = 'check_violation';
    END IF;

    -- Lock the accounts this journal touches, in a stable order, before checking balances.
    PERFORM 1 FROM club_ledger_accounts
      WHERE id IN (SELECT (l->>'account_id')::uuid FROM jsonb_array_elements(p_lines) l)
      ORDER BY id FOR UPDATE;

    INSERT INTO club_journal (idempotency_key, kind, event_id, memo, created_by)
        VALUES (p_key, p_kind, p_event, p_memo, p_actor) RETURNING id INTO v_id;
    INSERT INTO escrow_ledger (journal_id, account_id, debit, credit)
        SELECT v_id, (l->>'account_id')::uuid, coalesce((l->>'debit')::bigint, 0), coalesce((l->>'credit')::bigint, 0)
        FROM jsonb_array_elements(p_lines) l;

    SELECT a.code INTO v_bad FROM club_ledger_accounts a JOIN escrow_ledger e ON e.account_id = a.id
      WHERE a.kind IN ('event_escrow', 'vendor_payable')
        AND a.id IN (SELECT (l->>'account_id')::uuid FROM jsonb_array_elements(p_lines) l)
      GROUP BY a.code HAVING sum(e.credit) - sum(e.debit) < 0 LIMIT 1;
    IF v_bad IS NOT NULL THEN
        RAISE EXCEPTION 'Insufficient funds in %', v_bad USING ERRCODE = 'check_violation';
    END IF;
    RETURN v_id;
EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_id FROM club_journal WHERE idempotency_key = p_key;
    RETURN v_id;
END $$;

CREATE OR REPLACE VIEW public.club_account_balances WITH (security_invoker = true) AS
    SELECT a.id, a.code, a.kind, a.event_id, a.property_id,
           coalesce(sum(e.debit), 0)::bigint AS debits, coalesce(sum(e.credit), 0)::bigint AS credits
    FROM public.club_ledger_accounts a LEFT JOIN public.escrow_ledger e ON e.account_id = a.id
    GROUP BY a.id;

CREATE TABLE IF NOT EXISTS public.club_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.club_events(id) ON DELETE RESTRICT,
    agreement_id uuid REFERENCES public.club_agreements(id) ON DELETE RESTRICT,
    payer_id uuid NOT NULL REFERENCES public.viber_profiles(user_id) ON DELETE RESTRICT,
    purpose text NOT NULL CHECK (purpose IN ('deposit', 'participant')),
    installment integer NOT NULL DEFAULT 1,
    label text NOT NULL,
    amount bigint NOT NULL CHECK (amount > 0),
    currency text NOT NULL DEFAULT 'INR',
    status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'captured', 'failed')),
    gateway text NOT NULL DEFAULT 'razorpay',
    gateway_order_id text UNIQUE,
    gateway_payment_id text UNIQUE,
    idempotency_key text NOT NULL UNIQUE,
    journal_id uuid REFERENCES public.club_journal(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    captured_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_club_payments_event ON public.club_payments (event_id, status);

CREATE TABLE IF NOT EXISTS public.club_webhook_events (
    id text PRIMARY KEY,
    kind text NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.club_payouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.club_events(id) ON DELETE RESTRICT,
    property_id uuid REFERENCES public.property_marketplace(id) ON DELETE RESTRICT,
    payee_label text NOT NULL,
    third_party boolean NOT NULL DEFAULT false,
    amount bigint NOT NULL CHECK (amount > 0),
    status text NOT NULL DEFAULT 'pending_approval'
        CHECK (status IN ('pending_approval', 'approved', 'paid', 'rejected', 'failed')),
    provider text NOT NULL DEFAULT 'manual',
    idempotency_key text NOT NULL UNIQUE,
    approved_by uuid,
    approved_at timestamptz,
    allocate_journal_id uuid REFERENCES public.club_journal(id),
    paid_reference text,
    paid_at timestamptz,
    payout_journal_id uuid REFERENCES public.club_journal(id),
    attempts integer NOT NULL DEFAULT 0,
    last_error text,
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_payouts_event ON public.club_payouts (event_id, status);

CREATE TABLE IF NOT EXISTS public.club_nocs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL UNIQUE REFERENCES public.club_events(id) ON DELETE RESTRICT,
    code text NOT NULL UNIQUE,
    payload jsonb NOT NULL,
    signature text NOT NULL,
    issued_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['club_ledger_accounts', 'club_journal', 'escrow_ledger', 'club_payments',
        'club_webhook_events', 'club_payouts', 'club_nocs'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    END LOOP;
END $$;
REVOKE ALL ON public.club_account_balances FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.club_post_journal(text, text, uuid, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.club_post_journal(text, text, uuid, text, uuid, jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.club_ledger_immutable() FROM PUBLIC, anon, authenticated;

COMMIT;

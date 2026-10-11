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

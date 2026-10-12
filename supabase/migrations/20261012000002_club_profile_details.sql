-- Vibers Club, part 7: richer profiles. Members pick the kinds of traveller they are (solo, volunteer,
-- influencer ...), and add the social accounts they want shown as logos. Both columns are checked in
-- the database as well as by the server. Idempotent.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.viber_profiles') IS NULL THEN
        RAISE EXCEPTION 'Run 20261011000001 first (or paste supabase/club_setup_all.sql, which runs all of them in order).';
    END IF;
END $$;

ALTER TABLE public.viber_profiles ADD COLUMN IF NOT EXISTS traveler_kinds text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.viber_profiles ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
    ALTER TABLE public.viber_profiles ADD CONSTRAINT viber_profiles_traveler_kinds_check CHECK (
        cardinality(traveler_kinds) <= 5
        AND traveler_kinds <@ ARRAY['solo', 'nomad', 'volunteer', 'influencer', 'creator', 'photographer', 'foodie',
            'adventure', 'backpacker', 'luxury', 'slow', 'wellness', 'culture', 'business', 'festival']::text[]
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.viber_profiles ADD CONSTRAINT viber_profiles_social_links_check CHECK (jsonb_typeof(social_links) = 'object');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;

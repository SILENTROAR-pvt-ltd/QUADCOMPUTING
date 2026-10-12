-- Vibers Club, part 8: a Club username. It is a public handle chosen inside the Club and changeable
-- (with a cooldown). It is separate from the shared Viber ID, which stays private to the member and
-- staff. Quad Computing tables are not touched. Idempotent.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.viber_profiles') IS NULL THEN
        RAISE EXCEPTION 'Run 20261011000001 first (or paste supabase/club_setup_all.sql, which runs all of them in order).';
    END IF;
END $$;

ALTER TABLE public.viber_profiles ADD COLUMN IF NOT EXISTS club_username text;
ALTER TABLE public.viber_profiles ADD COLUMN IF NOT EXISTS username_changed_at timestamptz;

DO $$
BEGIN
    ALTER TABLE public.viber_profiles ADD CONSTRAINT viber_profiles_club_username_check
        CHECK (club_username IS NULL OR club_username ~ '^[a-z0-9_]{3,20}$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_viber_profiles_club_username ON public.viber_profiles (lower(club_username))
    WHERE club_username IS NOT NULL;

COMMIT;

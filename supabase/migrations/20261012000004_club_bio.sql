-- Vibers Club, part 9: a short bio. A few lines the member writes about themself (no preset text).
-- Checked in the database as well as by the server. Quad Computing tables are not touched. Idempotent.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.viber_profiles') IS NULL THEN
        RAISE EXCEPTION 'Run 20261011000001 first (or paste supabase/club_setup_all.sql, which runs all of them in order).';
    END IF;
END $$;

ALTER TABLE public.viber_profiles ADD COLUMN IF NOT EXISTS bio text;

DO $$
BEGIN
    ALTER TABLE public.viber_profiles ADD CONSTRAINT viber_profiles_bio_check
        CHECK (bio IS NULL OR char_length(bio) BETWEEN 1 AND 300);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;

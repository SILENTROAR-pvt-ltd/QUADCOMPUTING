-- Vibers Club, part 11: photos on meetups. A host can add up to four pictures, kept in the private
-- club media bucket like plan covers. Quad Computing tables are not touched. Idempotent.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.club_meetups') IS NULL THEN
        RAISE EXCEPTION 'Run 20261012000005_club_meetups.sql first (or paste supabase/club_setup_all.sql, which runs all of them in order).';
    END IF;
END $$;

ALTER TABLE public.club_meetups ADD COLUMN IF NOT EXISTS cover_paths text[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
    ALTER TABLE public.club_meetups ADD CONSTRAINT club_meetups_cover_paths_check CHECK (cardinality(cover_paths) <= 4);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;

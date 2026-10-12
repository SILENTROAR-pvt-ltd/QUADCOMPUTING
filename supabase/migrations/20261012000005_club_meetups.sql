-- Vibers Club, part 10: instant meetups. A quick coffee, a walk-around, a party, a developer meet: free,
-- posted in seconds, live straight away (only trips and ticketed events are reviewed). Members RSVP
-- with "I'm in". Server-only tables like the rest of the Club. Quad Computing tables are not touched.
-- Idempotent.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.club_places') IS NULL OR to_regclass('public.club_reports') IS NULL THEN
        RAISE EXCEPTION 'Run 20261011000001-5 and 20261012000001 first (or paste supabase/club_setup_all.sql, which runs all of them in order).';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.club_meetups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id uuid NOT NULL REFERENCES public.viber_profiles(user_id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('coffee', 'food', 'walk', 'party', 'music', 'sports', 'dev', 'creative', 'wellness', 'together')),
    title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 80),
    note text CHECK (note IS NULL OR char_length(note) <= 280),
    venue text CHECK (venue IS NULL OR char_length(venue) <= 120),
    city text NOT NULL CHECK (char_length(city) BETWEEN 2 AND 60),
    place_id uuid REFERENCES public.club_places(id) ON DELETE SET NULL,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    capacity integer CHECK (capacity IS NULL OR capacity BETWEEN 2 AND 500),
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'cancelled')),
    hidden boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT club_meetups_dates CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_club_meetups_live ON public.club_meetups (status, ends_at);
CREATE INDEX IF NOT EXISTS idx_club_meetups_host ON public.club_meetups (host_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_club_meetups_city ON public.club_meetups (lower(city));

CREATE TABLE IF NOT EXISTS public.club_meetup_members (
    meetup_id uuid NOT NULL REFERENCES public.club_meetups(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.viber_profiles(user_id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (meetup_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_club_meetup_members_user ON public.club_meetup_members (user_id);

-- Meetups can be reported like plans and posts.
ALTER TABLE public.club_reports DROP CONSTRAINT IF EXISTS club_reports_target_type_check;
ALTER TABLE public.club_reports ADD CONSTRAINT club_reports_target_type_check
    CHECK (target_type IN ('user', 'message', 'story', 'event', 'property', 'post', 'comment', 'meetup'));

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['club_meetups', 'club_meetup_members'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    END LOOP;
END $$;

COMMIT;

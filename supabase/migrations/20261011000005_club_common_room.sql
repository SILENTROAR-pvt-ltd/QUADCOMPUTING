-- Vibers Club, part 5: the Common Room. Members post their plans and questions, tag a place and a
-- region, optionally attach an approved plan, and like and comment on each other's posts. Reports
-- can now point at posts and comments. Server-only tables. Idempotent.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.club_events') IS NULL OR to_regclass('public.club_reports') IS NULL THEN
        RAISE EXCEPTION 'Run 20261011000001-3 first (or paste supabase/club_setup_all.sql, which runs all five in order).';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.club_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id uuid NOT NULL REFERENCES public.viber_profiles(user_id) ON DELETE CASCADE,
    body text NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
    place text CHECK (place IS NULL OR length(place) BETWEEN 2 AND 60),
    region text CHECK (region IS NULL OR region IN ('india', 'asia', 'europe', 'americas', 'africa', 'oceania')),
    event_id uuid REFERENCES public.club_events(id) ON DELETE SET NULL,
    -- Hidden posts are seen only by their author (shadow-ban) and by staff.
    hidden boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_posts_feed ON public.club_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_club_posts_author ON public.club_posts (author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.club_post_likes (
    post_id uuid NOT NULL REFERENCES public.club_posts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.viber_profiles(user_id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.club_post_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES public.club_posts(id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES public.viber_profiles(user_id) ON DELETE CASCADE,
    body text NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
    hidden boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_post_comments_post ON public.club_post_comments (post_id, created_at);

-- Red Flag reports can now point at Common Room posts and comments.
ALTER TABLE public.club_reports DROP CONSTRAINT IF EXISTS club_reports_target_type_check;
ALTER TABLE public.club_reports ADD CONSTRAINT club_reports_target_type_check
    CHECK (target_type IN ('user', 'message', 'story', 'event', 'property', 'post', 'comment'));

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['club_posts', 'club_post_likes', 'club_post_comments'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    END LOOP;
END $$;

COMMIT;

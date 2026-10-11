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

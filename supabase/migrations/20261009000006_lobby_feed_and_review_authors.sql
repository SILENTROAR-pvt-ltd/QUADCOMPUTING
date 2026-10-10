-- ============================================================================
-- 20261009000006_lobby_feed_and_review_authors.sql   (safe to re-run)
--
-- 1. Vibers Lobby: guests share messages, moments (a photo with a caption) and wants (requests).
--    Posts belong to one venue and to the signed-in guest who wrote them. Photos are in the public
--    bucket `lobby-media`, written only by the server (service role).
-- 2. Reviews can be linked to the guest account that wrote them, so the review card can show the
--    reviewer's profile photo. Older reviews keep their typed name and have no link.
-- Apply in the Supabase SQL editor. Nothing is dropped.
-- ============================================================================

BEGIN;

INSERT INTO storage.buckets (id, name, public)
VALUES ('lobby-media', 'lobby-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.lobby_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    author_account_id uuid REFERENCES public.guest_accounts(id) ON DELETE SET NULL,
    kind text NOT NULL CHECK (kind IN ('message', 'moment', 'want')),
    content text NOT NULL DEFAULT '' CHECK (char_length(content) <= 500),
    table_number text,
    media_path text CHECK (media_path IS NULL OR media_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_lobby_posts_venue_time ON public.lobby_posts (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lobby_posts_author ON public.lobby_posts (author_account_id);

-- Only the server (service role) reads and writes these tables; the browser never does.
ALTER TABLE public.lobby_posts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lobby_posts FROM anon, authenticated;

ALTER TABLE public.venue_reviews ADD COLUMN IF NOT EXISTS author_account_id uuid REFERENCES public.guest_accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_venue_reviews_author ON public.venue_reviews (author_account_id);

COMMIT;

-- ============================================================================
-- 20261009000007_lobby_likes_and_replies.sql   (safe to re-run)
--
-- Vibers Lobby: a guest can like a post (one like per guest) and reply under it.
-- Likes and replies are removed with their post. Only the server reads and writes them.
-- Apply in the Supabase SQL editor. Nothing is dropped.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.lobby_post_likes (
    post_id uuid NOT NULL REFERENCES public.lobby_posts(id) ON DELETE CASCADE,
    account_id uuid NOT NULL REFERENCES public.guest_accounts(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (post_id, account_id)
);

CREATE TABLE IF NOT EXISTS public.lobby_post_replies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES public.lobby_posts(id) ON DELETE CASCADE,
    author_account_id uuid REFERENCES public.guest_accounts(id) ON DELETE SET NULL,
    content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 300),
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_lobby_post_replies_post_time ON public.lobby_post_replies (post_id, created_at);

ALTER TABLE public.lobby_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_post_replies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lobby_post_likes FROM anon, authenticated;
REVOKE ALL ON public.lobby_post_replies FROM anon, authenticated;

COMMIT;

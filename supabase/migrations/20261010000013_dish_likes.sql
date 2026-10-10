-- ============================================================================
-- 20261010000013_dish_likes.sql   (safe to re-run)
--
-- Guests can like a dish on the menu (one like per signed-in guest per dish). The menu shows a
-- "Guest favourites" rail ranked by these likes. Likes go with their dish or guest account.
-- Only the server reads and writes them (same model as lobby_post_likes).
-- Apply in the Supabase SQL editor. Nothing is dropped.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.dish_likes (
    catalog_item_id uuid NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
    account_id uuid NOT NULL REFERENCES public.guest_accounts(id) ON DELETE CASCADE,
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (catalog_item_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_dish_likes_business ON public.dish_likes (business_id, catalog_item_id);

ALTER TABLE public.dish_likes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dish_likes FROM anon, authenticated;

COMMIT;

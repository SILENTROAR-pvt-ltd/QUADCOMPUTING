-- ============================================================================
-- 20261008000003_lobby_venue_scoping.sql   (self-contained, safe to re-run)
--
-- The social lobby tables (and guest_sessions) were never created in the live database: the
-- original migration 20260925000007 had not been applied, so this migration creates them, already
-- venue-scoped, instead of altering tables that do not exist.
--
--  * every lobby table carries business_id, so one venue's guests never see another's
--  * lobby_messages is publicly READABLE (the lounge feed uses Realtime with the anon key) but not
--    writable; posting goes through /api/guest/lobby (service role)
--  * table_invitations / private_chats / private_chat_messages / guest_sessions have RLS enabled
--    and NO policy: only the API (service role) can touch them
-- If an older version of these tables already exists, the ALTERs below bring it up to date.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── guest_sessions (lobby presence; written by /api/guest/onboard) ──────────
CREATE TABLE IF NOT EXISTS public.guest_sessions (
    customer_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id           uuid DEFAULT gen_random_uuid(),
    session_id   text UNIQUE,
    cafe_id      text,
    table_id     uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
    table_number text NOT NULL,
    guest_name   text NOT NULL,
    avatar       text DEFAULT '☕',
    status       text NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active', 'inactive', 'departed'])),
    created_at   timestamptz DEFAULT timezone('utc', now()),
    updated_at   timestamptz DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_cafe_table ON public.guest_sessions (cafe_id, table_number);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_status ON public.guest_sessions (status);

-- ── lobby_messages (public lounge feed) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lobby_messages (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id  uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
    session_id   text NOT NULL,
    guest_name   text NOT NULL,
    avatar       text NOT NULL,
    table_number text NOT NULL,
    content      text NOT NULL,
    created_at   timestamptz DEFAULT timezone('utc', now())
);
ALTER TABLE public.lobby_messages ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_lobby_messages_business_time ON public.lobby_messages (business_id, created_at DESC);

-- ── table_invitations ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.table_invitations (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id          uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
    sender_session_id    text NOT NULL,
    sender_name          text NOT NULL,
    sender_table         text NOT NULL,
    sender_avatar        text NOT NULL,
    receiver_table       text NOT NULL,
    receiver_session_id  text,
    interaction_type     text NOT NULL CHECK (interaction_type = ANY (ARRAY['coffee', 'join', 'message'])),
    custom_message       text,
    status               text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending', 'accepted', 'declined', 'expired'])),
    chat_id              uuid,
    created_at           timestamptz DEFAULT timezone('utc', now())
);
ALTER TABLE public.table_invitations ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_invitations_business ON public.table_invitations (business_id, receiver_table, status);

-- ── private_chats / private_chat_messages ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.private_chats (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id  uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
    session_a    text NOT NULL,
    session_b    text NOT NULL,
    table_a      text NOT NULL,
    table_b      text NOT NULL,
    status       text NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active', 'closed'])),
    created_at   timestamptz DEFAULT timezone('utc', now())
);
ALTER TABLE public.private_chats ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_private_chats_business ON public.private_chats (business_id);

CREATE TABLE IF NOT EXISTS public.private_chat_messages (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id            uuid NOT NULL REFERENCES public.private_chats(id) ON DELETE CASCADE,
    sender_session_id  text NOT NULL,
    sender_name        text NOT NULL,
    message            text NOT NULL,
    created_at         timestamptz DEFAULT timezone('utc', now())
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON public.private_chat_messages (chat_id, created_at ASC);

-- ── Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE public.guest_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_invitations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_chats         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop the old wide-open policies if an earlier version of these tables existed.
DROP POLICY IF EXISTS "Public guest sessions policy"        ON public.guest_sessions;
DROP POLICY IF EXISTS "Allow anon read/insert guest_sessions" ON public.guest_sessions;
DROP POLICY IF EXISTS "Public lobby messages policy"        ON public.lobby_messages;
DROP POLICY IF EXISTS "Public table invitations policy"     ON public.table_invitations;
DROP POLICY IF EXISTS "Public private chats policy"         ON public.private_chats;
DROP POLICY IF EXISTS "Public private chat messages policy" ON public.private_chat_messages;

DROP POLICY IF EXISTS "Public read lobby messages" ON public.lobby_messages;
CREATE POLICY "Public read lobby messages" ON public.lobby_messages FOR SELECT USING (true);

-- ── Realtime: the lounge feed subscribes to lobby_messages inserts ──────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_messages;
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END IF;
END $$;

COMMIT;

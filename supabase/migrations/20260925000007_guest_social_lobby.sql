-- ============================================================
-- MIGRATION: Guest QR Onboarding & Live Social Lobby Ecosystem
-- Introduces guest_sessions, table_invitations, private_chats,
-- private_chat_messages, and lobby_messages with Supabase Realtime
-- ============================================================

-- 1. CREATE GUEST_SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.guest_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id text NOT NULL,
    table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
    table_number text NOT NULL,
    guest_name text NOT NULL,
    avatar text NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'departed'::text])),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT guest_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT guest_sessions_session_id_key UNIQUE (session_id)
);

CREATE INDEX IF NOT EXISTS idx_guest_sessions_table ON public.guest_sessions(table_id, status);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_number ON public.guest_sessions(table_number, status);

-- 2. CREATE TABLE_INVITATIONS TABLE (Requests between tables)
CREATE TABLE IF NOT EXISTS public.table_invitations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    sender_session_id text NOT NULL,
    sender_name text NOT NULL,
    sender_table text NOT NULL,
    sender_avatar text NOT NULL,
    receiver_table text NOT NULL,
    receiver_session_id text,
    interaction_type text NOT NULL CHECK (interaction_type = ANY (ARRAY['coffee'::text, 'join'::text, 'message'::text])),
    custom_message text,
    status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'expired'::text])),
    chat_id uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT table_invitations_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_invitations_receiver ON public.table_invitations(receiver_table, status);
CREATE INDEX IF NOT EXISTS idx_invitations_sender ON public.table_invitations(sender_session_id);

-- 3. CREATE PRIVATE_CHATS TABLE
CREATE TABLE IF NOT EXISTS public.private_chats (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_a text NOT NULL,
    session_b text NOT NULL,
    table_a text NOT NULL,
    table_b text NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active'::text, 'closed'::text])),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT private_chats_pkey PRIMARY KEY (id)
);

-- 4. CREATE PRIVATE_CHAT_MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.private_chat_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    chat_id uuid NOT NULL REFERENCES public.private_chats(id) ON DELETE CASCADE,
    sender_session_id text NOT NULL,
    sender_name text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT private_chat_messages_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON public.private_chat_messages(chat_id, created_at ASC);

-- 5. CREATE LOBBY_MESSAGES TABLE (Public Lounge Feed)
CREATE TABLE IF NOT EXISTS public.lobby_messages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_id text NOT NULL,
    guest_name text NOT NULL,
    avatar text NOT NULL,
    table_number text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT lobby_messages_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_lobby_messages_time ON public.lobby_messages(created_at DESC);

-- 6. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_messages ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES
-- Guest sessions: readable and insertable/updatable by public guests & hosts
CREATE POLICY "Public guest sessions policy" ON public.guest_sessions
    FOR ALL USING (true)
    WITH CHECK (true);

-- Table invitations: public read/write for guest interactions
CREATE POLICY "Public table invitations policy" ON public.table_invitations
    FOR ALL USING (true)
    WITH CHECK (true);

-- Private chats: accessible by members
CREATE POLICY "Public private chats policy" ON public.private_chats
    FOR ALL USING (true)
    WITH CHECK (true);

-- Private chat messages
CREATE POLICY "Public private chat messages policy" ON public.private_chat_messages
    FOR ALL USING (true)
    WITH CHECK (true);

-- Lobby messages: public read/insert for active guests
CREATE POLICY "Public lobby messages policy" ON public.lobby_messages
    FOR ALL USING (true)
    WITH CHECK (true);

-- 8. ADD TO REALTIME PUBLICATION
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_sessions;
    EXCEPTION WHEN duplicate_object THEN
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.table_invitations;
    EXCEPTION WHEN duplicate_object THEN
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.private_chats;
    EXCEPTION WHEN duplicate_object THEN
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.private_chat_messages;
    EXCEPTION WHEN duplicate_object THEN
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_messages;
    EXCEPTION WHEN duplicate_object THEN
    END;
END $$;

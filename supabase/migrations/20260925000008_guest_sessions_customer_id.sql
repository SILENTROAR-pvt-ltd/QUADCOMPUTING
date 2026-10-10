-- ============================================================
-- MIGRATION: Production-Grade Guest Sessions with customer_id
-- Ensures guest_sessions supports customer_id (UUID PK),
-- cafe_id, table_number, guest_name, status, created_at
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ 
BEGIN
    -- 1. Create table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'guest_sessions') THEN
        CREATE TABLE public.guest_sessions (
            customer_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            id uuid DEFAULT gen_random_uuid(),
            session_id text,
            cafe_id text NOT NULL DEFAULT 'quad-default',
            table_number text NOT NULL,
            table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
            guest_name text NOT NULL,
            avatar text DEFAULT '☕',
            status text NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'departed'::text])),
            created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
            updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
        );
    ELSE
        -- 2. If table exists, ensure customer_id column is present
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guest_sessions' AND column_name = 'customer_id') THEN
            ALTER TABLE public.guest_sessions ADD COLUMN customer_id uuid DEFAULT gen_random_uuid();
        END IF;

        -- Ensure cafe_id column is present
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guest_sessions' AND column_name = 'cafe_id') THEN
            ALTER TABLE public.guest_sessions ADD COLUMN cafe_id text DEFAULT 'quad-default';
        END IF;

        -- Ensure avatar has default and nullable
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guest_sessions' AND column_name = 'avatar') THEN
            ALTER TABLE public.guest_sessions ALTER COLUMN avatar DROP NOT NULL;
            ALTER TABLE public.guest_sessions ALTER COLUMN avatar SET DEFAULT '☕';
        END IF;

        -- Ensure session_id is nullable if present
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guest_sessions' AND column_name = 'session_id') THEN
            ALTER TABLE public.guest_sessions ALTER COLUMN session_id DROP NOT NULL;
        END IF;
    END IF;
END $$;

-- 3. Create indexes for high-speed lookups
CREATE INDEX IF NOT EXISTS idx_guest_sessions_customer_id ON public.guest_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_cafe_table ON public.guest_sessions(cafe_id, table_number);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_status ON public.guest_sessions(status);

-- 4. Enable RLS and setup permissive policies for guest onboarding
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read/insert guest_sessions" ON public.guest_sessions;
CREATE POLICY "Allow anon read/insert guest_sessions"
    ON public.guest_sessions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. Add to realtime publication if available
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_sessions;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Table might already be part of publication
    NULL;
END $$;

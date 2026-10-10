-- ============================================================
-- MIGRATION: Real-time QR Session-Based Ordering Pipeline
-- Introduces dine_in_sessions, order_items, and master order linkage
-- ============================================================

-- 1. CREATE DINE_IN_SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.dine_in_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL,
    table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
    table_number text NOT NULL,
    guest_session_id text NOT NULL,
    status text NOT NULL DEFAULT 'open' CHECK (status = ANY (ARRAY['open'::text, 'bill_requested'::text, 'closed'::text])),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT dine_in_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT dine_in_sessions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dine_in_sessions_table ON public.dine_in_sessions(table_id, status);
CREATE INDEX IF NOT EXISTS idx_dine_in_sessions_biz ON public.dine_in_sessions(business_id, status);

-- 2. EXTEND ORDERS TABLE WITH SESSION LINKAGE
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.dine_in_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_session_id ON public.orders(session_id);

-- 3. CREATE ORDER_ITEMS TABLE (KOT LINES)
CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    item_id text,
    item_name text NOT NULL,
    price numeric NOT NULL DEFAULT 0,
    quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
    notes text,
    kot_status text NOT NULL DEFAULT 'pending' CHECK (kot_status = ANY (ARRAY['pending'::text, 'cooking'::text, 'served'::text, 'cancelled'::text])),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT order_items_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- 4. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.dine_in_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR HOSTS & GUESTS
-- Hosts can do all operations on their own business sessions
CREATE POLICY "Hosts manage their dine_in_sessions" ON public.dine_in_sessions
    FOR ALL USING (
        business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid())
    );

-- Public / Anonymous guests can read and write sessions for their active table
CREATE POLICY "Public guests read and create sessions" ON public.dine_in_sessions
    FOR ALL USING (true)
    WITH CHECK (true);

-- Public guests and hosts can insert and read order_items
CREATE POLICY "Public order items management" ON public.order_items
    FOR ALL USING (true)
    WITH CHECK (true);

-- 6. ENABLE REALTIME PUBLICATION
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.dine_in_sessions;
    EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
    EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication
    END;
END $$;

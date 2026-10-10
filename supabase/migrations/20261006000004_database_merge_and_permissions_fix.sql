-- =============================================================================
-- 20261006000004_database_merge_and_permissions_fix.sql
-- CRITICAL DATABASE MERGE & PERMISSIONS UNIFICATION
--
-- 1. Merges schema requirements across Profiles, Businesses, Locations,
--    Catalog Items, Item Options, Tables, Sessions, Orders, Kitchen Tickets,
--    Venue Wallets, and Subscriptions.
-- 2. Restores and grants essential table and function privileges to 'anon',
--    'authenticated', and 'service_role' so that both authenticated hosts and
--    guest sessions function seamlessly.
-- 3. Seeds Venus Cafe Oldmanali (UUID: aed7ace0-d1b5-4525-b5c6-403ad6fcc269)
--    with verified catalog items, item options, and restaurant tables.
-- =============================================================================

BEGIN;

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. BASE SCHEMA & TABLES
-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    role TEXT CHECK (role IN ('host', 'guest', 'admin', 'staff')) NOT NULL DEFAULT 'guest',
    full_name TEXT NOT NULL DEFAULT 'User',
    gender TEXT,
    dob DATE,
    global_wallet_balance DECIMAL(10,2) DEFAULT 0.00,
    referral_code TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Businesses
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    business_name TEXT,
    name TEXT,
    slug TEXT,
    categories TEXT[] DEFAULT ARRAY['Cafe'],
    gst_number TEXT,
    admin_pin TEXT,
    staff_pin TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add compatibility columns if missing
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT ARRAY['Cafe'];
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS host_id UUID;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS admin_pin TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS staff_pin TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_businesses_slug ON public.businesses(slug) WHERE slug IS NOT NULL;

-- Locations
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    branch_name TEXT NOT NULL,
    state TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    qr_code_hash TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Catalog Items
CREATE TABLE IF NOT EXISTS public.catalog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Dining',
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    description TEXT,
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    preparation_time_minutes INTEGER DEFAULT 15,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.catalog_items ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE public.catalog_items ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;
ALTER TABLE public.catalog_items ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Item Options (Addons & Customizations)
CREATE TABLE IF NOT EXISTS public.item_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.catalog_items(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Restaurant Tables
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL,
    seating_capacity INTEGER DEFAULT 4,
    status TEXT DEFAULT 'VACANT',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rt_business_table ON public.restaurant_tables (business_id, table_number);

-- Dine In Sessions
CREATE TABLE IF NOT EXISTS public.dine_in_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL,
    guest_name TEXT DEFAULT 'Guest',
    status TEXT DEFAULT 'active',
    customer_id TEXT,
    is_settled BOOLEAN DEFAULT false,
    settled_total NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.dine_in_sessions(id) ON DELETE SET NULL,
    table_number TEXT NOT NULL,
    guest_name TEXT DEFAULT 'Guest',
    status TEXT DEFAULT 'pending',
    subtotal NUMERIC(10,2) DEFAULT 0.00,
    tax_amount NUMERIC(10,2) DEFAULT 0.00,
    discount_amount NUMERIC(10,2) DEFAULT 0.00,
    grand_total NUMERIC(10,2) DEFAULT 0.00,
    payment_method TEXT DEFAULT 'cash',
    idempotency_key TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.catalog_items(id) ON DELETE SET NULL,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    quantity INTEGER NOT NULL DEFAULT 1,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    cooking_notes TEXT,
    status TEXT DEFAULT 'ordered',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Kitchen Tickets (KOT)
CREATE TABLE IF NOT EXISTS public.kitchen_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    ticket_number TEXT,
    table_number TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    station TEXT DEFAULT 'Kitchen',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Venue Wallets
CREATE TABLE IF NOT EXISTS public.venue_wallets (
    venue_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
    balance NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Venue Subscriptions
CREATE TABLE IF NOT EXISTS public.venue_subscriptions (
    id UUID DEFAULT gen_random_uuid(),
    venue_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    plan_tier TEXT DEFAULT 'pay_as_you_go',
    status TEXT DEFAULT 'active',
    current_period_end TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (id)
);

DO $$
BEGIN
    ALTER TABLE public.venue_subscriptions DROP CONSTRAINT IF EXISTS venue_subscriptions_plan_tier_check;
    ALTER TABLE public.venue_subscriptions ADD CONSTRAINT venue_subscriptions_plan_tier_check
        CHECK (plan_tier IN ('pay_as_you_go', '8k_2m', '12k_6m', '14k_9m', 'standard', 'pro', 'enterprise'));

    ALTER TABLE public.venue_subscriptions DROP CONSTRAINT IF EXISTS venue_subscriptions_status_check;
    ALTER TABLE public.venue_subscriptions ADD CONSTRAINT venue_subscriptions_status_check
        CHECK (status IN ('trial', 'trialing', 'active', 'expired', 'suspended'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Venue Top-Up Requests
CREATE TABLE IF NOT EXISTS public.venue_topup_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    utr_number TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    proof_image_url TEXT,
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. PERMISSIONS UNIFICATION: Grant essential schema access to anon & authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

-- 4. SEED VENUS CAFE OLDMANALI (aed7ace0-d1b5-4525-b5c6-403ad6fcc269)
DO $$
DECLARE
    v_cafe_id UUID := 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
    v_loc_id UUID;
    v_item_id1 UUID := gen_random_uuid();
    v_item_id2 UUID := gen_random_uuid();
    v_item_id3 UUID := gen_random_uuid();
    v_item_id4 UUID := gen_random_uuid();
    v_item_id5 UUID := gen_random_uuid();
    v_item_id6 UUID := gen_random_uuid();
BEGIN
    -- Upsert Business
    INSERT INTO public.businesses (id, business_name, name, slug, categories)
    VALUES (
        v_cafe_id,
        'Venus Cafe Oldmanali',
        'Venus Cafe Oldmanali',
        'venus-cafe',
        ARRAY['Cafe', 'Restaurant', 'Bakery']
    )
    ON CONFLICT (id) DO UPDATE SET
        business_name = EXCLUDED.business_name,
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        categories = EXCLUDED.categories;

    -- Upsert Location
    SELECT id INTO v_loc_id FROM public.locations WHERE business_id = v_cafe_id LIMIT 1;
    IF v_loc_id IS NULL THEN
        INSERT INTO public.locations (business_id, branch_name, address, city, state, qr_code_hash)
        VALUES (
            v_cafe_id,
            'Old Manali Sanctuary',
            'Club House Road, Old Manali',
            'Manali',
            'Himachal Pradesh',
            'qr_venus_cafe_manali'
        )
        RETURNING id INTO v_loc_id;
    END IF;

    -- Upsert Wallet & Subscription
    INSERT INTO public.venue_wallets (venue_id, balance)
    VALUES (v_cafe_id, 5000.00)
    ON CONFLICT (venue_id) DO UPDATE SET balance = GREATEST(venue_wallets.balance, 5000.00);

    INSERT INTO public.venue_subscriptions (venue_id, plan_tier, status)
    VALUES (v_cafe_id, 'pay_as_you_go', 'active')
    ON CONFLICT (venue_id) DO UPDATE SET status = 'active', plan_tier = 'pay_as_you_go';

    -- Upsert Restaurant Tables
    INSERT INTO public.restaurant_tables (business_id, table_number, seating_capacity, status)
    VALUES
        (v_cafe_id, 'T-01', 4, 'VACANT'),
        (v_cafe_id, 'T-02', 2, 'VACANT'),
        (v_cafe_id, 'T-03', 6, 'VACANT'),
        (v_cafe_id, 'T-04', 4, 'VACANT')
    ON CONFLICT (business_id, table_number) DO NOTHING;

    -- Seed Catalog Items (if not already seeded)
    IF NOT EXISTS (SELECT 1 FROM public.catalog_items WHERE business_id = v_cafe_id) THEN
        INSERT INTO public.catalog_items (id, business_id, location_id, name, category, price, description, is_available)
        VALUES
            (v_item_id1, v_cafe_id, v_loc_id, 'Artisan Himalayan Espresso', 'Beverages', 180.00, 'Double shot espresso roasted from organic mountain beans with silky crema.', true),
            (v_item_id2, v_cafe_id, v_loc_id, 'Wild Honey & Cinnamon Tea', 'Beverages', 140.00, 'Handpicked herbal infusion steeped with local raw pine honey.', true),
            (v_item_id3, v_cafe_id, v_loc_id, 'Old Manali Trout Sizzle', 'Mains', 580.00, 'Fresh river trout seared in Himalayan herb butter with roasted baby potatoes.', true),
            (v_item_id4, v_cafe_id, v_loc_id, 'Truffle Mushroom Woodfired Pizza', 'Mains', 490.00, 'Wild forest mushrooms, fior di latte mozzarella, and white truffle oil.', true),
            (v_item_id5, v_cafe_id, v_loc_id, 'Crispy Himalayan Bruschetta', 'Starters', 260.00, 'Sourdough toast topped with slow-roasted cherry tomatoes and fresh mountain basil.', true),
            (v_item_id6, v_cafe_id, v_loc_id, 'Mountain Berry Cheesecake', 'Desserts', 320.00, 'Chilled artisan cheesecake layered with wild berry compote from Kullu Valley.', true);

        -- Seed Item Options
        INSERT INTO public.item_options (business_id, item_id, name, price, is_available)
        VALUES
            (v_cafe_id, v_item_id1, 'Extra Espresso Shot', 60.00, true),
            (v_cafe_id, v_item_id1, 'Oat Milk Substitution', 40.00, true),
            (v_cafe_id, v_item_id4, 'Extra Truffle Glaze', 90.00, true),
            (v_cafe_id, v_item_id4, 'Vegan Cheese Alternative', 70.00, true);
    END IF;
END $$;

COMMIT;

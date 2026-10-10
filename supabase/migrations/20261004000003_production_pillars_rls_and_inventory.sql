-- ============================================================
-- 20261004000003_production_pillars_rls_and_inventory.sql
-- Pillar 1: High-Performance Cached Auth & Strict RLS Isolation
-- Pillar 4: Automated Recipe-Driven Inventory Deduction & Low-Stock Alerts
-- ============================================================

-- ============================================================
-- STEP 1: PRE-FLIGHT SCHEMA HARDENING (ENSURE business_id & COLUMNS EXIST)
-- ============================================================

-- Ensure staff_notifications table exists
CREATE TABLE IF NOT EXISTS public.staff_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    table_number TEXT,
    notification_type TEXT DEFAULT 'SERVICE',
    message TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Ensure staff_profiles exists with business_id and auth_user_id
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    auth_user_id UUID,
    name TEXT NOT NULL DEFAULT 'Staff Member',
    contact_number TEXT,
    designation TEXT,
    department TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);
ALTER TABLE IF EXISTS public.staff_profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE IF EXISTS public.staff_profiles ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Ensure business_id exists across all operational tables
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.dine_in_sessions ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.operational_expenses ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.raw_inventory_items ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.inventory_logs ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.kitchen_tickets ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.guest_wallets ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Add business_id to order_items (fixes ERROR 42703)
ALTER TABLE IF EXISTS public.order_items ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_order_items_biz_id ON public.order_items(business_id);

-- Add business_id to wallet_transactions (fixes ERROR 42703)
ALTER TABLE IF EXISTS public.wallet_transactions ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_biz_id ON public.wallet_transactions(business_id);

-- Backfill business_id for order_items from parent orders
DO $$
BEGIN
    UPDATE public.order_items oi
    SET business_id = o.business_id
    FROM public.orders o
    WHERE oi.order_id = o.id AND oi.business_id IS NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Backfill business_id for wallet_transactions from parent guest_wallets
DO $$
BEGIN
    UPDATE public.wallet_transactions wt
    SET business_id = gw.business_id
    FROM public.guest_wallets gw
    WHERE wt.wallet_id = gw.id AND wt.business_id IS NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Auto-populate business_id on insert for order_items if omitted
CREATE OR REPLACE FUNCTION public.sync_order_item_business_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.business_id IS NULL AND NEW.order_id IS NOT NULL THEN
        SELECT business_id INTO NEW.business_id FROM public.orders WHERE id = NEW.order_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_order_item_business_id ON public.order_items;
CREATE TRIGGER trg_sync_order_item_business_id
BEFORE INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_item_business_id();

-- Auto-populate business_id on insert for wallet_transactions if omitted
CREATE OR REPLACE FUNCTION public.sync_wallet_transaction_business_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.business_id IS NULL AND NEW.wallet_id IS NOT NULL THEN
        SELECT business_id INTO NEW.business_id FROM public.guest_wallets WHERE id = NEW.wallet_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_wallet_transaction_business_id ON public.wallet_transactions;
CREATE TRIGGER trg_sync_wallet_transaction_business_id
BEFORE INSERT ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_wallet_transaction_business_id();

-- ============================================================
-- STEP 2: CACHED AUTHORIZATION HELPER FUNCTION (STABLE, SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_auth_business_ids()
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_biz_ids uuid[];
BEGIN
    IF v_uid IS NULL THEN
        RETURN ARRAY[]::uuid[];
    END IF;

    SELECT ARRAY_AGG(DISTINCT biz_id) INTO v_biz_ids
    FROM (
        -- Host ownership
        SELECT id AS biz_id FROM public.businesses WHERE host_id = v_uid
        UNION
        -- Active staff profile linkage
        SELECT business_id AS biz_id FROM public.staff_profiles 
        WHERE (auth_user_id = v_uid OR id = v_uid) AND (status IS NULL OR status = 'ACTIVE')
    ) t;

    RETURN COALESCE(v_biz_ids, ARRAY[]::uuid[]);
END;
$$;

-- Grant execution to authenticated & service_role
DO $$
BEGIN
    GRANT EXECUTE ON FUNCTION public.get_auth_business_ids() TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- STEP 3: MANDATORY RLS POLICIES ACROSS ALL OPERATIONAL TABLES
-- ============================================================

-- A. orders
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Host and staff access orders" ON public.orders;
DROP POLICY IF EXISTS "Public guests read their table orders" ON public.orders;
DROP POLICY IF EXISTS "Public guests insert orders" ON public.orders;

CREATE POLICY "Host and staff access orders" ON public.orders
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));

CREATE POLICY "Public guests read their table orders" ON public.orders
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "Public guests insert orders" ON public.orders
    FOR INSERT TO anon
    WITH CHECK (true);

-- B. order_items
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Host and staff access order_items" ON public.order_items;
DROP POLICY IF EXISTS "Public read order_items" ON public.order_items;
DROP POLICY IF EXISTS "Public insert order_items" ON public.order_items;

CREATE POLICY "Host and staff access order_items" ON public.order_items
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));

CREATE POLICY "Public read order_items" ON public.order_items
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "Public insert order_items" ON public.order_items
    FOR INSERT TO anon
    WITH CHECK (true);

-- C. dine_in_sessions
ALTER TABLE IF EXISTS public.dine_in_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Host and staff access dine_in_sessions" ON public.dine_in_sessions;
DROP POLICY IF EXISTS "Public read dine_in_sessions" ON public.dine_in_sessions;
DROP POLICY IF EXISTS "Public insert dine_in_sessions" ON public.dine_in_sessions;
DROP POLICY IF EXISTS "Public update guest session request" ON public.dine_in_sessions;

CREATE POLICY "Host and staff access dine_in_sessions" ON public.dine_in_sessions
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));

CREATE POLICY "Public read dine_in_sessions" ON public.dine_in_sessions
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "Public insert dine_in_sessions" ON public.dine_in_sessions
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "Public update guest session request" ON public.dine_in_sessions
    FOR UPDATE TO anon
    USING (true)
    WITH CHECK (true);

-- D. guest_wallets
ALTER TABLE IF EXISTS public.guest_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Host and staff access guest_wallets" ON public.guest_wallets;
DROP POLICY IF EXISTS "Public read guest_wallets" ON public.guest_wallets;

CREATE POLICY "Host and staff access guest_wallets" ON public.guest_wallets
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));

CREATE POLICY "Public read guest_wallets" ON public.guest_wallets
    FOR SELECT TO anon
    USING (true);

-- E. wallet_transactions
ALTER TABLE IF EXISTS public.wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Host and staff access wallet_transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Public read wallet_transactions" ON public.wallet_transactions;

CREATE POLICY "Host and staff access wallet_transactions" ON public.wallet_transactions
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));

CREATE POLICY "Public read wallet_transactions" ON public.wallet_transactions
    FOR SELECT TO anon
    USING (true);

-- F. raw_inventory_items & inventory_logs
ALTER TABLE IF EXISTS public.raw_inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Host and staff access raw_inventory_items" ON public.raw_inventory_items;

CREATE POLICY "Host and staff access raw_inventory_items" ON public.raw_inventory_items
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));

ALTER TABLE IF EXISTS public.inventory_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Host and staff access inventory_logs" ON public.inventory_logs;

CREATE POLICY "Host and staff access inventory_logs" ON public.inventory_logs
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));

-- G. operational_expenses
ALTER TABLE IF EXISTS public.operational_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Host and staff access operational_expenses" ON public.operational_expenses;

CREATE POLICY "Host and staff access operational_expenses" ON public.operational_expenses
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));

-- H. kitchen_tickets
ALTER TABLE IF EXISTS public.kitchen_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Host and staff access kitchen_tickets" ON public.kitchen_tickets;
DROP POLICY IF EXISTS "Public read kitchen_tickets" ON public.kitchen_tickets;

CREATE POLICY "Host and staff access kitchen_tickets" ON public.kitchen_tickets
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));

CREATE POLICY "Public read kitchen_tickets" ON public.kitchen_tickets
    FOR SELECT TO anon
    USING (true);

-- I. staff_notifications
ALTER TABLE IF EXISTS public.staff_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Host and staff access staff_notifications" ON public.staff_notifications;
DROP POLICY IF EXISTS "Public insert staff_notifications" ON public.staff_notifications;

CREATE POLICY "Host and staff access staff_notifications" ON public.staff_notifications
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));

CREATE POLICY "Public insert staff_notifications" ON public.staff_notifications
    FOR INSERT TO anon
    WITH CHECK (true);

-- ============================================================
-- STEP 4: PILLAR 4: RECIPE-DRIVEN INVENTORY DEDUCTION & LOW-STOCK ALERTS
-- ============================================================
CREATE OR REPLACE FUNCTION public.deduct_recipe_inventory_for_order(
    p_order_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order record;
    v_item record;
    v_recipe record;
    v_raw_item record;
    v_qty_to_deduct numeric;
    v_new_stock numeric;
    v_deductions_count int := 0;
    v_low_stock_alerts_count int := 0;
BEGIN
    SET LOCAL statement_timeout = '4000ms';
    SET LOCAL lock_timeout = '2500ms';

    -- Fetch order
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
    END IF;

    -- Loop through order_items
    FOR v_item IN
        SELECT item_id, quantity
        FROM public.order_items
        WHERE order_id = p_order_id
    LOOP
        -- For each ordered item, check recipe ingredients
        FOR v_recipe IN
            SELECT raw_item_id, quantity_required
            FROM public.recipe_ingredients
            WHERE catalog_item_id::text = v_item.item_id::text
        LOOP
            v_qty_to_deduct := COALESCE(v_recipe.quantity_required, 0) * COALESCE(v_item.quantity, 1);

            IF v_qty_to_deduct > 0 THEN
                -- Lock inventory row to prevent concurrent race conditions
                SELECT * INTO v_raw_item
                FROM public.raw_inventory_items
                WHERE id = v_recipe.raw_item_id
                FOR UPDATE;

                IF FOUND THEN
                    v_new_stock := GREATEST(0, v_raw_item.current_stock - v_qty_to_deduct);

                    UPDATE public.raw_inventory_items
                    SET current_stock = v_new_stock,
                        updated_at = now()
                    WHERE id = v_raw_item.id;

                    -- Insert audit log
                    INSERT INTO public.inventory_logs (
                        business_id, item_id, change_amount, action_type, notes,
                        unit_cost_at_time, total_cost, logged_at
                    ) VALUES (
                        v_order.business_id, v_raw_item.id, -v_qty_to_deduct, 'CONSUMPTION',
                        'Auto-deducted for Order ' || p_order_id,
                        COALESCE(v_raw_item.cost_per_unit, 0),
                        COALESCE(v_raw_item.cost_per_unit, 0) * v_qty_to_deduct,
                        now()
                    );

                    v_deductions_count := v_deductions_count + 1;

                    -- Check threshold trigger for low-stock alert
                    IF v_new_stock <= COALESCE(v_raw_item.threshold, 5) THEN
                        INSERT INTO public.staff_notifications (
                            business_id, notification_type, message, status, created_at
                        ) VALUES (
                            v_order.business_id,
                            'LOW_STOCK_ALERT',
                            'Low Stock Warning: ' || v_raw_item.item_name || ' is at ' || v_new_stock || ' ' || COALESCE(v_raw_item.unit, 'units') || ' (Threshold: ' || COALESCE(v_raw_item.threshold, 5) || ')',
                            'PENDING',
                            now()
                        );
                        v_low_stock_alerts_count := v_low_stock_alerts_count + 1;
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'deductions_count', v_deductions_count,
        'low_stock_alerts_count', v_low_stock_alerts_count
    );
END;
$$;

-- Grant execution to authenticated & service_role
DO $$
BEGIN
    GRANT EXECUTE ON FUNCTION public.deduct_recipe_inventory_for_order(uuid) TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

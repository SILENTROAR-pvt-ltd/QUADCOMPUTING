-- ============================================================================
-- 20261010000007_inventory_movement_engine.sql   (safe to re-run)
--
-- Raw inventory becomes a ledger: every change to a stock level is one row in
-- inventory_logs written in the same transaction as the stock update.
--
-- 1. Columns: preferred supplier on items; supplier, reference and stock-after on
--    movements (so the ledger reads like a stock card).
-- 2. record_inventory_movement(): purchases (weighted-average cost), opening
--    stock, wastage, signed adjustments and physical counts, row-locked.
-- 3. deduct_recipe_inventory_for_order(): one idempotent deduction for every
--    order type. QR orders are read from order_items; till (POS) orders, which
--    have no order_items, from the order's own lines. Recipes are matched only
--    within the order's venue. Stock may go negative, so a missing purchase
--    shows up instead of being hidden at zero. A low-stock alert is raised once,
--    when an item crosses its reorder level, not on every order after.
-- 4. Realtime for the stock screen.
-- ============================================================================

ALTER TABLE public.raw_inventory_items ADD COLUMN IF NOT EXISTS supplier_name text;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS supplier_name text;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS reference text;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS stock_after numeric;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS logged_at timestamptz DEFAULT now();
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS unit_cost_at_time numeric DEFAULT 0;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS total_cost numeric DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_inventory_logs_biz_time ON public.inventory_logs (business_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_item_time ON public.inventory_logs (item_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_raw ON public.recipe_ingredients (raw_item_id);

-- ── 2. Stock movements ──────────────────────────────────────────────────────
-- Runs as the caller, so row level security decides which venue's stock can move.
CREATE OR REPLACE FUNCTION public.record_inventory_movement(
    p_business_id uuid,
    p_item_id uuid,
    p_type text,
    p_quantity numeric,
    p_unit_cost numeric DEFAULT NULL,
    p_supplier text DEFAULT NULL,
    p_reference text DEFAULT NULL,
    p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_item record;
    v_type text := upper(coalesce(p_type, ''));
    v_change numeric;
    v_cost numeric;
    v_on_hand numeric;
    v_after numeric;
BEGIN
    IF v_type NOT IN ('PURCHASE', 'OPENING', 'WASTAGE', 'ADJUSTMENT', 'COUNT') THEN
        RAISE EXCEPTION 'INVALID_MOVEMENT_TYPE: %', p_type USING ERRCODE = '22023';
    END IF;
    IF p_quantity IS NULL OR (v_type <> 'COUNT' AND v_type <> 'ADJUSTMENT' AND p_quantity <= 0)
       OR (v_type = 'COUNT' AND p_quantity < 0) OR (v_type = 'ADJUSTMENT' AND p_quantity = 0) THEN
        RAISE EXCEPTION 'INVALID_QUANTITY' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_item FROM public.raw_inventory_items
    WHERE id = p_item_id AND business_id = p_business_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ITEM_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    v_on_hand := coalesce(v_item.current_stock, 0);
    v_cost := coalesce(v_item.cost_per_unit, 0);

    v_change := CASE v_type
        WHEN 'PURCHASE' THEN p_quantity
        WHEN 'OPENING' THEN p_quantity
        WHEN 'WASTAGE' THEN -p_quantity
        WHEN 'ADJUSTMENT' THEN p_quantity
        ELSE p_quantity - v_on_hand          -- COUNT: the counted quantity is the truth
    END;

    -- Weighted-average cost: stock already on hand keeps its cost, new stock brings its own.
    IF v_type IN ('PURCHASE', 'OPENING') AND p_unit_cost IS NOT NULL AND p_unit_cost >= 0 THEN
        v_cost := CASE WHEN greatest(v_on_hand, 0) + p_quantity > 0
            THEN round((greatest(v_on_hand, 0) * v_cost + p_quantity * p_unit_cost) / (greatest(v_on_hand, 0) + p_quantity), 4)
            ELSE p_unit_cost END;
    END IF;

    v_after := v_on_hand + v_change;

    UPDATE public.raw_inventory_items
    SET current_stock = v_after,
        cost_per_unit = v_cost,
        supplier_name = CASE WHEN v_type = 'PURCHASE' AND nullif(trim(p_supplier), '') IS NOT NULL
                             THEN trim(p_supplier) ELSE supplier_name END,
        updated_at = now()
    WHERE id = v_item.id;

    IF v_change <> 0 OR v_type = 'COUNT' THEN
        INSERT INTO public.inventory_logs (
            business_id, item_id, change_amount, action_type, notes, supplier_name, reference,
            unit_cost_at_time, total_cost, stock_after, logged_at
        ) VALUES (
            p_business_id, v_item.id, v_change, v_type, nullif(trim(p_notes), ''),
            nullif(trim(p_supplier), ''), nullif(trim(p_reference), ''),
            CASE WHEN v_type IN ('PURCHASE', 'OPENING') THEN coalesce(p_unit_cost, v_cost) ELSE v_cost END,
            abs(v_change) * CASE WHEN v_type IN ('PURCHASE', 'OPENING') THEN coalesce(p_unit_cost, v_cost) ELSE v_cost END,
            v_after, now()
        );
    END IF;

    IF v_type = 'COUNT' THEN
        INSERT INTO public.inventory_audits (business_id, raw_item_id, theoretical_stock, physical_stock, notes)
        VALUES (p_business_id, v_item.id, v_on_hand, p_quantity, coalesce(nullif(trim(p_notes), ''), 'Stock count'));
    END IF;

    RETURN jsonb_build_object('item_id', v_item.id, 'change', v_change, 'stock_after', v_after, 'cost_per_unit', v_cost);
END;
$$;

DO $$ BEGIN
    GRANT EXECUTE ON FUNCTION public.record_inventory_movement(uuid, uuid, text, numeric, numeric, text, text, text) TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ── 3. Recipe deduction for any order, once ────────────────────────────────
CREATE OR REPLACE FUNCTION public.deduct_recipe_inventory_for_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order record;
    v_use record;
    v_raw record;
    v_after numeric;
    v_count int := 0;
    v_alerts int := 0;
    v_has_lines boolean;
BEGIN
    SET LOCAL statement_timeout = '4000ms';
    SET LOCAL lock_timeout = '2500ms';

    -- A signed-in caller may only deduct for their own venue's orders (the service role has no uid).
    UPDATE public.orders SET inventory_deducted_at = now()
    WHERE id = p_order_id AND inventory_deducted_at IS NULL
      AND (auth.uid() IS NULL OR business_id = ANY(public.get_auth_business_ids()))
    RETURNING * INTO v_order;
    IF NOT FOUND THEN
        IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id
                       AND (auth.uid() IS NULL OR business_id = ANY(public.get_auth_business_ids()))) THEN
            RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
        END IF;
        RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'already_deducted', true, 'deductions_count', 0);
    END IF;

    SELECT EXISTS (SELECT 1 FROM public.order_items WHERE order_id = p_order_id) INTO v_has_lines;

    -- Total use per raw item across the order's dishes.
    FOR v_use IN
        WITH lines AS (
            SELECT oi.item_id::text AS catalog_id, coalesce(oi.quantity, 1)::numeric AS qty
            FROM public.order_items oi
            WHERE v_has_lines AND oi.order_id = p_order_id
            UNION ALL
            SELECT coalesce(e->>'catalog_item_id', e->>'item_id', e->>'id'),
                   greatest(coalesce(
                       CASE WHEN e->>'qty' ~ '^[0-9]+(\.[0-9]+)?$' THEN (e->>'qty')::numeric END,
                       CASE WHEN e->>'quantity' ~ '^[0-9]+(\.[0-9]+)?$' THEN (e->>'quantity')::numeric END,
                       1), 0)
            FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_order.items) = 'array' THEN v_order.items ELSE '[]'::jsonb END) e
            WHERE NOT v_has_lines
        )
        SELECT r.raw_item_id, sum(coalesce(r.quantity_required, 0) * l.qty) AS used
        FROM lines l
        JOIN public.recipe_ingredients r
          ON r.catalog_item_id::text = l.catalog_id AND r.business_id = v_order.business_id
        GROUP BY r.raw_item_id
        HAVING sum(coalesce(r.quantity_required, 0) * l.qty) > 0
    LOOP
        SELECT * INTO v_raw FROM public.raw_inventory_items
        WHERE id = v_use.raw_item_id AND business_id = v_order.business_id
        FOR UPDATE;
        CONTINUE WHEN NOT FOUND;

        v_after := coalesce(v_raw.current_stock, 0) - v_use.used;
        UPDATE public.raw_inventory_items SET current_stock = v_after, updated_at = now() WHERE id = v_raw.id;

        INSERT INTO public.inventory_logs (
            business_id, item_id, change_amount, action_type, notes, reference,
            unit_cost_at_time, total_cost, stock_after, logged_at
        ) VALUES (
            v_order.business_id, v_raw.id, -v_use.used, 'CONSUMPTION',
            'Used by ' || coalesce(v_order.table_number, 'order'), p_order_id::text,
            coalesce(v_raw.cost_per_unit, 0), coalesce(v_raw.cost_per_unit, 0) * v_use.used, v_after, now()
        );
        v_count := v_count + 1;

        IF coalesce(v_raw.current_stock, 0) > coalesce(v_raw.threshold, 5) AND v_after <= coalesce(v_raw.threshold, 5) THEN
            INSERT INTO public.staff_notifications (business_id, notification_type, message, status, created_at)
            VALUES (v_order.business_id, 'LOW_STOCK_ALERT',
                    'Low stock: ' || v_raw.item_name || ' is at ' || round(v_after, 3) || ' ' || coalesce(v_raw.unit, 'units')
                    || ' (reorder at ' || coalesce(v_raw.threshold, 5) || ')', 'PENDING', now());
            v_alerts := v_alerts + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'already_deducted', false,
                              'deductions_count', v_count, 'low_stock_alerts_count', v_alerts);
END;
$$;

DO $$ BEGIN
    REVOKE EXECUTE ON FUNCTION public.deduct_recipe_inventory_for_order(uuid) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.deduct_recipe_inventory_for_order(uuid) TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ── 4. Realtime ─────────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['raw_inventory_items', 'inventory_logs'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END $$;

-- Migration: 20261006000001_update_kot_status_rpc.sql
-- Description: Atomic Kitchen Ticket State Machine RPC (update_kot_status), audit log table, and realtime publication

-- 1. Extend kitchen_tickets table with station, staff_id, and status_history audit array if missing
ALTER TABLE IF EXISTS public.kitchen_tickets 
  ADD COLUMN IF NOT EXISTS station TEXT DEFAULT 'Kitchen',
  ADD COLUMN IF NOT EXISTS staff_id UUID,
  ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;

-- 2. Create KOT status audit log table
CREATE TABLE IF NOT EXISTS public.kot_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.kitchen_tickets(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_kot_status_logs_ticket ON public.kot_status_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_kot_status_logs_created_at ON public.kot_status_logs(created_at);

-- 3. Ensure order_items kot_status check constraint supports full lifecycle
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'order_items_kot_status_check'
    ) THEN
        ALTER TABLE public.order_items DROP CONSTRAINT order_items_kot_status_check;
    END IF;

    ALTER TABLE public.order_items 
      ADD CONSTRAINT order_items_kot_status_check 
      CHECK (kot_status = ANY (ARRAY['pending'::text, 'cooking'::text, 'preparing'::text, 'ready'::text, 'served'::text, 'cancelled'::text]));
EXCEPTION WHEN OTHERS THEN
    -- Table or constraint may already match
    NULL;
END $$;

-- 4. Enable Realtime publication for kitchen_tickets if not already active
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'kitchen_tickets'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.kitchen_tickets;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 5. Atomic Kitchen Ticket State Machine RPC
-- Valid transitions: PENDING -> PREPARING -> READY -> SERVED (or CANCELLED from non-terminal states)
CREATE OR REPLACE FUNCTION public.update_kot_status(
    p_ticket_id UUID,
    p_new_status TEXT,
    p_staff_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ticket RECORD;
    v_updated_ticket RECORD;
    v_current_status TEXT;
    v_target_status TEXT;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_history_entry JSONB;
BEGIN
    -- Input check
    IF p_ticket_id IS NULL THEN
        RAISE EXCEPTION 'p_ticket_id is required';
    END IF;
    IF p_new_status IS NULL OR trim(p_new_status) = '' THEN
        RAISE EXCEPTION 'p_new_status is required';
    END IF;

    -- Fetch and row-lock ticket
    SELECT * INTO v_ticket
    FROM public.kitchen_tickets
    WHERE id = p_ticket_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Kitchen ticket % not found', p_ticket_id;
    END IF;

    v_current_status := upper(trim(v_ticket.status));
    v_target_status := upper(trim(p_new_status));

    -- Allowed statuses enum check
    IF v_target_status NOT IN ('PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED') THEN
        RAISE EXCEPTION 'Invalid target status: %', p_new_status;
    END IF;

    -- Idempotent check: if already at target status, return gracefully
    IF v_current_status = v_target_status THEN
        RETURN jsonb_build_object(
            'success', true,
            'ticket_id', p_ticket_id,
            'status', v_target_status,
            'previous_status', v_current_status,
            'idempotent', true,
            'ticket', to_jsonb(v_ticket)
        );
    END IF;

    -- State machine transition rules:
    -- PENDING   -> PREPARING, CANCELLED
    -- PREPARING -> READY, CANCELLED
    -- READY     -> SERVED, CANCELLED
    -- SERVED & CANCELLED are terminal
    IF NOT (
        (v_current_status = 'PENDING' AND v_target_status IN ('PREPARING', 'CANCELLED')) OR
        (v_current_status = 'PREPARING' AND v_target_status IN ('READY', 'CANCELLED')) OR
        (v_current_status = 'READY' AND v_target_status IN ('SERVED', 'CANCELLED'))
    ) THEN
        RAISE EXCEPTION 'Invalid KOT status transition from % to % for ticket %', v_current_status, v_target_status, p_ticket_id;
    END IF;

    -- Prepare audit log JSON entry
    v_history_entry := jsonb_build_object(
        'from', v_current_status,
        'to', v_target_status,
        'at', v_now,
        'staff_id', p_staff_id
    );

    -- 1. Atomically update kitchen_tickets record
    UPDATE public.kitchen_tickets
    SET status = v_target_status,
        updated_at = v_now,
        staff_id = COALESCE(p_staff_id, staff_id),
        status_history = COALESCE(status_history, '[]'::jsonb) || v_history_entry
    WHERE id = p_ticket_id
    RETURNING * INTO v_updated_ticket;

    -- 2. Insert into audit trail
    INSERT INTO public.kot_status_logs (
        ticket_id,
        previous_status,
        new_status,
        changed_by,
        created_at
    ) VALUES (
        p_ticket_id,
        v_current_status,
        v_target_status,
        p_staff_id,
        v_now
    );

    -- 3. Synchronize linked order and order_items where applicable
    IF v_ticket.order_id IS NOT NULL THEN
        -- Sync order_items kot_status
        UPDATE public.order_items
        SET kot_status = CASE
            WHEN v_target_status = 'PREPARING' THEN 'preparing'
            WHEN v_target_status = 'READY' THEN 'ready'
            WHEN v_target_status = 'SERVED' THEN 'served'
            WHEN v_target_status = 'CANCELLED' THEN 'cancelled'
            ELSE kot_status
        END
        WHERE order_id = v_ticket.order_id;

        -- Sync parent order status if not settled or closed
        UPDATE public.orders
        SET status = CASE
            WHEN v_target_status = 'PREPARING' THEN 'preparing'
            WHEN v_target_status = 'READY' THEN 'ready'
            WHEN v_target_status = 'SERVED' THEN 'served'
            WHEN v_target_status = 'CANCELLED' THEN 'cancelled'
            ELSE status
        END,
        updated_at = v_now
        WHERE id = v_ticket.order_id
          AND status NOT IN ('settled', 'SETTLED', 'closed', 'CLOSED');
    END IF;

    -- 4. Atomically deduct inventory when ticket is SERVED
    IF v_target_status = 'SERVED' AND v_ticket.order_id IS NOT NULL THEN
        BEGIN
            PERFORM public.deduct_recipe_inventory_for_order(v_ticket.order_id);
        EXCEPTION WHEN OTHERS THEN
            -- Notice log if recipe tables are unconfigured for this order
            RAISE NOTICE 'Inventory recipe deduction note for order %: %', v_ticket.order_id, SQLERRM;
        END;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'ticket_id', p_ticket_id,
        'previous_status', v_current_status,
        'status', v_target_status,
        'ticket', to_jsonb(v_updated_ticket)
    );
END;
$$;

-- 6. Lock down execution: service_role ONLY
REVOKE ALL ON FUNCTION public.update_kot_status(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_kot_status(UUID, TEXT, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.update_kot_status(UUID, TEXT, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.update_kot_status(UUID, TEXT, UUID) TO service_role;

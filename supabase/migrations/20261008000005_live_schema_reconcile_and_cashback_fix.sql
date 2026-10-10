-- ============================================================================
-- 20261008000005_live_schema_reconcile_and_cashback_fix.sql   (safe to re-run)
--
-- Found by probing the deployed database against every migration (QA run,
-- 2026-10-08). Migrations here are applied by hand in the SQL editor, and the
-- live schema was missing 36 columns the application reads/writes:
--
--   * 20261003000001 (guest ID fields on rooms / room_stay_logs) was never
--     applied -> every room check-in and checkout write failed.
--   * 20261005000003 (PIN hashes, orders.invoice_number) was never applied.
--   * 20261006000004 "redefined" existing tables with CREATE TABLE IF NOT
--     EXISTS, which is a no-op on an existing table, so none of its new
--     columns were ever added (dine_in_sessions.guest_name, item_options.*, ...).
--
-- Part 1 only ADDS missing columns (nullable or with defaults) and backfills
-- the newer item_options columns from the legacy ones. Nothing is dropped,
-- renamed or tightened, so existing data and code paths keep working.
--
-- Part 2 redefines execute_atomic_bill_settlement. The deployed copy predates
-- 20261007000001 and, on every settlement:
--   * wrote balance_before/after off by one credit (it read the balance AFTER
--     inserting the wallet), corrupting the cashback ledger;
--   * computed 7% of the GST-inclusive grand total, while the guest and the POS
--     both promise 7% of the bill before tax;
--   * credited a synthetic 'table_<n>' wallet when no guest was identified;
--   * could credit the same order twice on a retried settlement.
-- ============================================================================

BEGIN;

-- ── Part 1: additive schema reconciliation ──────────────────────────────────

-- 20261003000001: guest identification on rooms / stay logs
ALTER TABLE public.rooms          ADD COLUMN IF NOT EXISTS id_type text;
ALTER TABLE public.rooms          ADD COLUMN IF NOT EXISTS id_number text;
ALTER TABLE public.rooms          ADD COLUMN IF NOT EXISTS guest_email text;
ALTER TABLE public.rooms          ADD COLUMN IF NOT EXISTS guest_address text;
ALTER TABLE public.room_stay_logs ADD COLUMN IF NOT EXISTS id_type text;
ALTER TABLE public.room_stay_logs ADD COLUMN IF NOT EXISTS id_number text;
ALTER TABLE public.room_stay_logs ADD COLUMN IF NOT EXISTS guest_email text;
ALTER TABLE public.room_stay_logs ADD COLUMN IF NOT EXISTS guest_address text;

-- 20261005000003: hashed PINs + invoice number
ALTER TABLE public.businesses     ADD COLUMN IF NOT EXISTS admin_pin_hash text;
ALTER TABLE public.businesses     ADD COLUMN IF NOT EXISTS staff_pin_hash text;
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS pin_hash text;
ALTER TABLE public.orders         ADD COLUMN IF NOT EXISTS invoice_number text;

-- 20261006000004: columns that its CREATE TABLE IF NOT EXISTS never added
ALTER TABLE public.catalog_items    ADD COLUMN IF NOT EXISTS preparation_time_minutes integer DEFAULT 15;
ALTER TABLE public.catalog_items    ADD COLUMN IF NOT EXISTS tags text[] DEFAULT ARRAY[]::text[];
ALTER TABLE public.dine_in_sessions ADD COLUMN IF NOT EXISTS customer_id text;
ALTER TABLE public.dine_in_sessions ADD COLUMN IF NOT EXISTS guest_name text;
ALTER TABLE public.dine_in_sessions ADD COLUMN IF NOT EXISTS is_settled boolean DEFAULT false;
ALTER TABLE public.dine_in_sessions ADD COLUMN IF NOT EXISTS settled_total numeric(10,2) DEFAULT 0.00;
ALTER TABLE public.kitchen_tickets  ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.kitchen_tickets  ADD COLUMN IF NOT EXISTS table_number text;   -- nullable: table_or_room is the live column
ALTER TABLE public.order_items      ADD COLUMN IF NOT EXISTS cooking_notes text;
ALTER TABLE public.order_items      ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.order_items      ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.order_items      ADD COLUMN IF NOT EXISTS subtotal numeric(10,2) DEFAULT 0.00;
ALTER TABLE public.orders           ADD COLUMN IF NOT EXISTS guest_name text;
ALTER TABLE public.orders           ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now());
ALTER TABLE public.venue_subscriptions  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;
ALTER TABLE public.venue_topup_requests ADD COLUMN IF NOT EXISTS proof_image_url text;
ALTER TABLE public.venue_topup_requests ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public.venue_topup_requests ADD COLUMN IF NOT EXISTS verified_by uuid;

-- item_options: add the newer shape alongside the legacy one, then backfill it
ALTER TABLE public.item_options ADD COLUMN IF NOT EXISTS item_id uuid REFERENCES public.catalog_items(id) ON DELETE CASCADE;
ALTER TABLE public.item_options ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.item_options ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.item_options ADD COLUMN IF NOT EXISTS price numeric(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.item_options ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;
ALTER TABLE public.item_options ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now());

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'item_options' AND column_name = 'catalog_item_id') THEN
        UPDATE public.item_options o
        SET item_id     = COALESCE(o.item_id, o.catalog_item_id),
            name        = COALESCE(o.name, o.option_name),
            price       = CASE WHEN o.price = 0 AND COALESCE(o.additional_price, 0) <> 0 THEN o.additional_price ELSE o.price END,
            business_id = COALESCE(o.business_id, ci.business_id)
        FROM public.catalog_items ci
        WHERE ci.id = o.catalog_item_id
          AND (o.item_id IS NULL OR o.name IS NULL OR o.business_id IS NULL);
    END IF;
END $$;

-- ── Part 2: settlement function (cashback base, ledger, idempotency) ────────

CREATE OR REPLACE FUNCTION public.execute_atomic_bill_settlement(
    p_session_id text,
    p_order_id text,
    p_table_number text,
    p_business_id uuid,
    p_grand_total numeric,
    p_subtotal numeric,
    p_discount_amount numeric DEFAULT 0,
    p_discount_type text DEFAULT 'percentage',
    p_redemption_code text DEFAULT NULL,
    p_guest_id text DEFAULT NULL,
    p_guest_handle text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wallet_id uuid;
    v_current_balance numeric := 0;
    v_redeem_amt numeric := 0;
    v_cashback_amt numeric := 0;
    v_cashback_base numeric := 0;
    v_redemption_rec record;
    v_target_guest_id text;
    v_business_text text := p_business_id::text;
    v_order_uuid uuid;
    v_caller_role text;
    v_caller_uid uuid;
    v_is_authorized boolean := false;
BEGIN
    SET LOCAL statement_timeout = '4000ms';
    SET LOCAL lock_timeout = '2500ms';

    -- ── IDOR ownership verification (unchanged) ──
    v_caller_role := current_setting('request.jwt.claim.role', true);
    IF v_caller_role = 'authenticated' THEN
        BEGIN
            v_caller_uid := auth.uid();
        EXCEPTION WHEN OTHERS THEN
            v_caller_uid := NULL;
        END;

        IF v_caller_uid IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1 FROM public.businesses
                WHERE id = p_business_id AND host_id = v_caller_uid
            ) OR EXISTS (
                SELECT 1 FROM public.staff_profiles
                WHERE business_id = p_business_id AND auth_user_id = v_caller_uid
            ) INTO v_is_authorized;

            IF NOT v_is_authorized THEN
                RAISE EXCEPTION 'IDOR_ACCESS_DENIED: Caller % is not authorized for business %', v_caller_uid, p_business_id;
            END IF;
        END IF;
    END IF;

    IF p_order_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_order_uuid := p_order_id::uuid;
    END IF;

    -- ── Cross-resource integrity (unchanged) ──
    IF v_order_uuid IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.orders
            WHERE id = v_order_uuid
              AND business_id = p_business_id
              AND (p_table_number IS NULL OR table_number ILIKE '%' || p_table_number || '%')
        ) THEN
            RAISE EXCEPTION 'IDOR_RESOURCE_MISMATCH: Order % does not belong to business % or table %', p_order_id, p_business_id, p_table_number;
        END IF;
    END IF;

    IF p_session_id IS NOT NULL AND p_session_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.dine_in_sessions
            WHERE id = p_session_id::uuid AND business_id = p_business_id
        ) THEN
            RAISE EXCEPTION 'IDOR_RESOURCE_MISMATCH: Session % does not belong to business %', p_session_id, p_business_id;
        END IF;
    END IF;

    -- Only a real guest identity earns cashback / can redeem. No synthetic
    -- 'table_<n>' wallets: nobody can ever see or spend those.
    v_target_guest_id := NULLIF(btrim(COALESCE(p_guest_handle, p_guest_id, '')), '');

    -- ── One-time redemption (unchanged apart from the guest-id guard) ──
    IF p_redemption_code IS NOT NULL AND trim(p_redemption_code) <> '' THEN
        SELECT * INTO v_redemption_rec
        FROM public.wallet_redemptions
        WHERE code = upper(trim(p_redemption_code))
          AND (business_id = v_business_text OR cafe_id = v_business_text)
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'IDOR_RESOURCE_MISMATCH: Redemption code % not found for business %', p_redemption_code, p_business_id;
        END IF;

        IF v_redemption_rec.status = 'redeemed' THEN
            RAISE EXCEPTION 'REDEMPTION_ALREADY_USED: Code % was already redeemed at %', p_redemption_code, v_redemption_rec.redeemed_at;
        END IF;

        v_redeem_amt := v_redemption_rec.amount;

        UPDATE public.wallet_redemptions
        SET status = 'redeemed', redeemed_at = now()
        WHERE code = upper(trim(p_redemption_code));

        SELECT id, balance INTO v_wallet_id, v_current_balance
        FROM public.guest_wallets
        WHERE (id = v_redemption_rec.wallet_id OR (v_target_guest_id IS NOT NULL AND guest_id = v_target_guest_id))
          AND (business_id = p_business_id OR cafe_id = v_business_text)
        FOR UPDATE;

        IF FOUND THEN
            UPDATE public.guest_wallets
            SET balance = GREATEST(0, balance - v_redeem_amt),
                updated_at = now()
            WHERE id = v_wallet_id;

            INSERT INTO public.wallet_transactions(
                wallet_id, guest_id, business_id, cafe_id, table_number, order_id, transaction_type,
                rate, amount, balance_before, balance_after, description
            ) VALUES (
                v_wallet_id, COALESCE(v_target_guest_id, v_redemption_rec.guest_id), p_business_id, v_business_text, p_table_number, v_order_uuid, 'REDEMPTION',
                '100%', v_redeem_amt, v_current_balance, GREATEST(0, v_current_balance - v_redeem_amt),
                'Redeemed ₹' || v_redeem_amt || ' with code ' || p_redemption_code
            );
        END IF;
    END IF;

    -- ── 7% cashback on the bill before tax, after discount; once per order ──
    v_cashback_base := GREATEST(0, COALESCE(NULLIF(p_subtotal, 0), p_grand_total, 0) - COALESCE(p_discount_amount, 0));
    v_cashback_amt := round(v_cashback_base * 0.07, 2);

    IF v_target_guest_id IS NOT NULL AND v_cashback_amt > 0
       AND NOT (v_order_uuid IS NOT NULL AND EXISTS (
           SELECT 1 FROM public.wallet_transactions
           WHERE order_id = v_order_uuid AND transaction_type = 'CASHBACK'
       )) THEN

        SELECT id, balance INTO v_wallet_id, v_current_balance
        FROM public.guest_wallets
        WHERE guest_id = v_target_guest_id
          AND (business_id = p_business_id OR cafe_id = v_business_text)
        FOR UPDATE;

        IF NOT FOUND THEN
            v_current_balance := 0;
            INSERT INTO public.guest_wallets(guest_id, business_id, cafe_id, balance, total_cashback_earned)
            VALUES (v_target_guest_id, p_business_id, v_business_text, v_cashback_amt, v_cashback_amt)
            RETURNING id INTO v_wallet_id;
        ELSE
            UPDATE public.guest_wallets
            SET balance = balance + v_cashback_amt,
                total_cashback_earned = total_cashback_earned + v_cashback_amt,
                updated_at = now()
            WHERE id = v_wallet_id;
        END IF;

        INSERT INTO public.wallet_transactions(
            wallet_id, guest_id, business_id, cafe_id, table_number, order_id, transaction_type,
            rate, amount, balance_before, balance_after, description
        ) VALUES (
            v_wallet_id, v_target_guest_id, p_business_id, v_business_text, p_table_number, v_order_uuid, 'CASHBACK',
            '7%', v_cashback_amt, v_current_balance, v_current_balance + v_cashback_amt,
            '7% Cashback on Table ' || COALESCE(p_table_number, '')
        );
    ELSE
        v_cashback_amt := 0;
    END IF;

    -- ── Order / session / table state (unchanged) ──
    IF p_session_id IS NOT NULL AND p_session_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        UPDATE public.dine_in_sessions
        SET status = 'closed', updated_at = now()
        WHERE id = p_session_id::uuid;
    END IF;

    IF v_order_uuid IS NOT NULL THEN
        UPDATE public.orders
        SET status = 'settled',
            grand_total = p_grand_total
        WHERE id = v_order_uuid;
    END IF;

    IF p_table_number IS NOT NULL AND p_table_number <> '' THEN
        UPDATE public.restaurant_tables
        SET status = 'VACANT'
        WHERE business_id = p_business_id
          AND upper(table_number) = upper(p_table_number);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'cashback_credited', v_cashback_amt,
        'redeemed_amount', v_redeem_amt,
        'guest_id', v_target_guest_id,
        'table_number', p_table_number
    );
END;
$$;

DO $$ BEGIN
    REVOKE EXECUTE ON FUNCTION public.execute_atomic_bill_settlement(text, text, text, uuid, numeric, numeric, numeric, text, text, text, text) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.execute_atomic_bill_settlement(text, text, text, uuid, numeric, numeric, numeric, text, text, text, text) TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

COMMIT;

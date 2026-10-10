-- ============================================================
-- 20261004000001_comprehensive_rls_and_rpc_lockdown.sql
-- Step 1 & Step 4: Database Security Lockdown, Strict RLS, and Atomic RPC
-- ============================================================

-- 1. Enable RLS on all transactional tables
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dine_in_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guest_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wallet_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.restaurant_tables ENABLE ROW LEVEL SECURITY;

-- 2. Revoke dangerous direct mutations on financial ledgers for anon role
REVOKE UPDATE, INSERT, DELETE ON public.guest_wallets FROM anon;
REVOKE UPDATE, INSERT, DELETE ON public.wallet_transactions FROM anon;
REVOKE UPDATE, DELETE ON public.wallet_redemptions FROM anon;

-- 3. Lock down guest_wallets RLS
DROP POLICY IF EXISTS "Wallet update scoped to business" ON public.guest_wallets;
DROP POLICY IF EXISTS "Wallet insert scoped to business" ON public.guest_wallets;
DROP POLICY IF EXISTS "Anon cannot update guest_wallets" ON public.guest_wallets;
DROP POLICY IF EXISTS "Anon cannot insert guest_wallets" ON public.guest_wallets;

CREATE POLICY "Anon cannot update guest_wallets" ON public.guest_wallets
    FOR UPDATE TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Anon cannot insert guest_wallets" ON public.guest_wallets
    FOR INSERT TO anon WITH CHECK (false);

-- 4. Lock down wallet_transactions RLS (Ledger Immutability)
DROP POLICY IF EXISTS "Wallet tx insert only" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Anon cannot insert wallet_transactions" ON public.wallet_transactions;

CREATE POLICY "Anon cannot insert wallet_transactions" ON public.wallet_transactions
    FOR INSERT TO anon WITH CHECK (false);

CREATE POLICY "No updates on wallet_transactions" ON public.wallet_transactions
    FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "No deletes on wallet_transactions" ON public.wallet_transactions
    FOR DELETE USING (false);

-- 5. Lock down wallet_redemptions RLS
DROP POLICY IF EXISTS "Anon cannot mutate wallet_redemptions" ON public.wallet_redemptions;
CREATE POLICY "Anon cannot mutate wallet_redemptions" ON public.wallet_redemptions
    FOR UPDATE TO anon USING (false) WITH CHECK (false);

-- 6. Atomic Bill Settlement RPC (SECURITY DEFINER)
-- Executes:
--   1. Validates session and order
--   2. Enforces single-use redemption code and deducts from wallet
--   3. Calculates & credits cashback atomically
--   4. Updates session and order statuses
--   5. Vacates table
-- If any error occurs, Postgres rolls back the entire transaction!
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
    v_redemption_rec record;
    v_result jsonb;
    v_target_guest_id text;
BEGIN
    v_target_guest_id := COALESCE(p_guest_handle, p_guest_id, 'table_' || p_table_number);

    -- 1. If redemption code is provided, validate single-use
    IF p_redemption_code IS NOT NULL AND trim(p_redemption_code) <> '' THEN
        SELECT * INTO v_redemption_rec
        FROM public.wallet_redemptions
        WHERE code = upper(trim(p_redemption_code))
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Redemption code % not found', p_redemption_code;
        END IF;

        IF v_redemption_rec.status = 'redeemed' THEN
            RAISE EXCEPTION 'Redemption code % has already been redeemed', p_redemption_code;
        END IF;

        v_redeem_amt := v_redemption_rec.amount;

        -- Update redemption record
        UPDATE public.wallet_redemptions
        SET status = 'redeemed',
            redeemed_at = now()
        WHERE code = upper(trim(p_redemption_code));

        -- Deduct from wallet
        SELECT id, balance INTO v_wallet_id, v_current_balance
        FROM public.guest_wallets
        WHERE (guest_id = v_target_guest_id OR id = v_redemption_rec.wallet_id)
          AND (business_id = p_business_id OR cafe_id = p_business_id)
        FOR UPDATE;

        IF FOUND THEN
            UPDATE public.guest_wallets
            SET balance = GREATEST(0, balance - v_redeem_amt),
                updated_at = now()
            WHERE id = v_wallet_id;

            INSERT INTO public.wallet_transactions(
                wallet_id, guest_id, cafe_id, table_number, transaction_type,
                rate, amount, balance_before, balance_after, description
            ) VALUES (
                v_wallet_id, v_target_guest_id, p_business_id, p_table_number, 'REDEMPTION',
                '100%', v_redeem_amt, v_current_balance, GREATEST(0, v_current_balance - v_redeem_amt),
                'Redeemed ₹' || v_redeem_amt || ' with code ' || p_redemption_code
            );
        END IF;
    END IF;

    -- 2. Calculate 7% cashback on settled amount
    IF p_grand_total > 0 THEN
        v_cashback_amt := round(p_grand_total * 0.07, 2);

        -- Find or create wallet
        SELECT id, balance INTO v_wallet_id, v_current_balance
        FROM public.guest_wallets
        WHERE guest_id = v_target_guest_id
          AND (business_id = p_business_id OR cafe_id = p_business_id)
        FOR UPDATE;

        IF NOT FOUND THEN
            INSERT INTO public.guest_wallets(
                guest_id, business_id, cafe_id, guest_handle, balance, total_cashback_earned
            ) VALUES (
                v_target_guest_id, p_business_id, p_business_id, p_guest_handle, v_cashback_amt, v_cashback_amt
            ) RETURNING id, balance INTO v_wallet_id, v_current_balance;
        ELSE
            UPDATE public.guest_wallets
            SET balance = balance + v_cashback_amt,
                total_cashback_earned = total_cashback_earned + v_cashback_amt,
                updated_at = now()
            WHERE id = v_wallet_id;
        END IF;

        -- Record cashback transaction
        INSERT INTO public.wallet_transactions(
            wallet_id, guest_id, cafe_id, table_number, transaction_type,
            rate, amount, balance_before, balance_after, description
        ) VALUES (
            v_wallet_id, v_target_guest_id, p_business_id, p_table_number, 'CASHBACK',
            '7%', v_cashback_amt, v_current_balance, v_current_balance + v_cashback_amt,
            '7% Cashback on Table ' || p_table_number
        );
    END IF;

    -- 3. Close Dine-In Session
    IF p_session_id IS NOT NULL AND p_session_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        UPDATE public.dine_in_sessions
        SET status = 'settled',
            ended_at = now()
        WHERE id = p_session_id::uuid;
    END IF;

    -- 4. Mark Orders Settled
    IF p_order_id IS NOT NULL AND p_order_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        UPDATE public.orders
        SET status = 'completed',
            payment_status = 'settled',
            grand_total = p_grand_total
        WHERE id = p_order_id::uuid;
    END IF;

    -- 5. Mark Table Vacant
    IF p_table_number IS NOT NULL AND p_table_number <> '' THEN
        UPDATE public.restaurant_tables
        SET status = 'vacant',
            active_session_id = NULL
        WHERE business_id = p_business_id
          AND upper(table_number) = upper(p_table_number);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'cashback_credited', v_cashback_amt,
        'redeemed_amount', v_redeem_amt,
        'table_number', p_table_number
    );
END;
$$;

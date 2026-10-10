-- ============================================================
-- 20261005000003_p0_hardening_idempotency_gst_pins.sql
-- P0: Database-Backed Idempotency, Wallet Integrity, GST & PIN Security
-- ============================================================

-- 1. Database-backed Idempotency on Orders (Prevents double order placement)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_idempotency 
ON public.orders(business_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- 2. Prevent Multiple Open Sessions Per Physical Table
CREATE UNIQUE INDEX IF NOT EXISTS uq_open_session 
ON public.dine_in_sessions(table_id) 
WHERE status <> 'closed';

-- 3. Wallet Duplicate Prevention Per Guest & Venue
ALTER TABLE public.guest_wallets DROP CONSTRAINT IF EXISTS uq_wallet;
ALTER TABLE public.guest_wallets ADD CONSTRAINT uq_wallet UNIQUE (guest_id, business_id);

-- 4. Fix Wallet Transaction Idempotency Key Collision (Include transaction_type)
-- Avoids collision when order has both CASHBACK and REDEMPTION
ALTER TABLE public.wallet_transactions 
ALTER COLUMN idempotency_key SET DEFAULT (
    CASE WHEN order_id IS NOT NULL 
         THEN order_id::text || '_' || guest_id || '_' || transaction_type 
         ELSE NULL END
);

-- 5. Top-up Fraud & Venue Balance Integrity
ALTER TABLE public.venue_topup_requests DROP CONSTRAINT IF EXISTS uq_utr;
ALTER TABLE public.venue_topup_requests ADD CONSTRAINT uq_utr UNIQUE (utr_number);

ALTER TABLE public.venue_wallets DROP CONSTRAINT IF EXISTS chk_bal;
ALTER TABLE public.venue_wallets ADD CONSTRAINT chk_bal CHECK (balance >= 0);

-- 6. GST Legal Compliance Fields on Orders
ALTER TABLE public.orders 
    ADD COLUMN IF NOT EXISTS invoice_number TEXT,
    ADD COLUMN IF NOT EXISTS gstin TEXT,
    ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS hsn_sac_code TEXT;

-- 7. Hashed PIN Security & Verification RPC
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS pin_hash TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS admin_pin_hash TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS staff_pin_hash TEXT;

CREATE OR REPLACE FUNCTION public.verify_staff_pin(p_staff_id UUID, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_stored_hash TEXT;
BEGIN
    SELECT pin_hash INTO v_stored_hash FROM public.staff_profiles WHERE id = p_staff_id;
    IF v_stored_hash IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN v_stored_hash = crypt(p_pin, v_stored_hash);
END;
$$;

DO $$ BEGIN
    GRANT EXECUTE ON FUNCTION public.verify_staff_pin(UUID, TEXT) TO authenticated, service_role;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

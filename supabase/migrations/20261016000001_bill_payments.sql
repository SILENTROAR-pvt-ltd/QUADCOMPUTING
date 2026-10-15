-- ============================================================================
-- 20261016000001_bill_payments.sql   (safe to re-run; adds one new table, changes nothing existing)
--
-- How a table's bill is going to be paid, chosen by the guest after asking for the bill:
--   chosen   the guest picked UPI, cash or card (the waiter and billing are told)
--   claimed  the guest says they paid by UPI (the waiter checks their phone screen)
--   verified staff confirmed the money was received (billing settles in one tap)
--   settled  the bill was settled; cancelled: the guest changed their mind or the bill changed
-- The amount is written by the server from the open order, never taken from the browser.
-- At most one live payment exists per table at a time.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.bill_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    session_id uuid,
    order_id uuid,
    table_number text NOT NULL,
    guest_handle text,
    method text NOT NULL CHECK (method IN ('UPI', 'CASH', 'CARD')),
    -- What is to be paid by this method: the bill, less any wallet the guest set aside.
    amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
    wallet_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (wallet_amount >= 0),
    status text NOT NULL DEFAULT 'chosen' CHECK (status IN ('chosen', 'claimed', 'verified', 'settled', 'cancelled')),
    claimed_at timestamptz,
    verified_at timestamptz,
    verified_by text,
    settled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bill_payments_business_status_idx ON public.bill_payments (business_id, status);
CREATE INDEX IF NOT EXISTS bill_payments_session_idx ON public.bill_payments (session_id);

-- One live payment per table: a second choice updates the first instead of piling up.
CREATE UNIQUE INDEX IF NOT EXISTS bill_payments_one_live_per_table
    ON public.bill_payments (business_id, table_number)
    WHERE status IN ('chosen', 'claimed', 'verified');

ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;

-- Hosts read and update their own venue's payments. Guests never touch this table directly: the server writes it.
DROP POLICY IF EXISTS "Hosts read their bill payments" ON public.bill_payments;
CREATE POLICY "Hosts read their bill payments" ON public.bill_payments
    FOR SELECT USING (
        business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid())
    );

DROP POLICY IF EXISTS "Hosts update their bill payments" ON public.bill_payments;
CREATE POLICY "Hosts update their bill payments" ON public.bill_payments
    FOR UPDATE USING (
        business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid())
    ) WITH CHECK (
        business_id IN (SELECT id FROM public.businesses WHERE host_id = auth.uid())
    );

COMMIT;

-- ----------------------------------------------------------------------------
-- CHECK (read-only), after applying: expect one row saying OK.
--   select case when exists (select 1 from information_schema.tables
--                            where table_schema = 'public' and table_name = 'bill_payments')
--          then 'OK' else 'MISSING' end as bill_payments;
-- ----------------------------------------------------------------------------

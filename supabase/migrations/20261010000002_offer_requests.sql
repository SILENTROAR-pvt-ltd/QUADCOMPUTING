-- ============================================================================
-- 20261010000002_offer_requests.sql   (safe to re-run)
--
-- Live offers, end to end:
-- 1. A guest redeems an offer (gets a short code the host settles at the counter) or asks the host
--    about it. Each one is stored in venue_offer_requests and raises a live alert for the host.
-- 2. staff_notifications accepts the two new alert types (OFFER_REDEEM, OFFER_INQUIRY).
-- Only the server reads and writes venue_offer_requests. Apply in the Supabase SQL editor.
-- ============================================================================

BEGIN;

ALTER TABLE public.staff_notifications DROP CONSTRAINT IF EXISTS staff_notifications_type_check;
ALTER TABLE public.staff_notifications
    ADD CONSTRAINT staff_notifications_type_check
    CHECK (notification_type = ANY (ARRAY[
        'WAITER', 'CHEF', 'BILL', 'SERVICE',
        'LOW_STOCK_ALERT', 'WALLET_SUSPENDED_LOW_BALANCE',
        'OFFER_REDEEM', 'OFFER_INQUIRY'
    ]));

CREATE TABLE IF NOT EXISTS public.venue_offer_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    offer_id uuid REFERENCES public.venue_live_offers(id) ON DELETE SET NULL,
    offer_title text NOT NULL CHECK (char_length(offer_title) <= 120),
    kind text NOT NULL CHECK (kind IN ('redeem', 'inquiry')),
    code text CHECK (code IS NULL OR code ~ '^[A-Z2-9]{6}$'),
    table_number text,
    guest_name text CHECK (guest_name IS NULL OR char_length(guest_name) <= 60),
    guest_account_id uuid REFERENCES public.guest_accounts(id) ON DELETE SET NULL,
    message text CHECK (message IS NULL OR char_length(message) <= 300),
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'settled', 'closed')),
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    settled_at timestamptz,
    CHECK ((kind = 'redeem') = (code IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_venue_offer_requests_venue ON public.venue_offer_requests (venue_id, status, created_at DESC);

ALTER TABLE public.venue_offer_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.venue_offer_requests FROM anon, authenticated;

COMMIT;

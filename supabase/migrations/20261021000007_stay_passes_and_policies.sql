-- ============================================================================
-- 20261021000007_stay_passes_and_policies.sql
--
-- Paid self check-in, early check-in and late check-out.
--
--  1. stay_passes: a guest self-checks-in only with a pass the desk issued AFTER taking the room payment (direct UPI,
--     cash or card, settled the way a table bill is). The pass holds the quote that was billed and a hashed one-time
--     token; the guest's link carries the token, and the table is server-only (RLS on, no client grants).
--  2. rooms / room_stay_logs: what the guest has already paid (advance_paid) and the fee lines that belong on the
--     final bill (stay_extras: early check-in, late check-out), so checkout credits the advance exactly once.
--  3. rooms.late_checkout_request: the guest's pending request, answered by the desk.
--  4. businesses.stay_policies: the owner's early check-in / late check-out options and fees.
--  5. stay_booking_requests.expected_arrival: standard, early:<option id>, or late (after hours).
--
-- Additive and idempotent. Apply before deploying the build that reads these columns.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.stay_passes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  booking_id        uuid REFERENCES public.stay_booking_requests(id) ON DELETE SET NULL,
  category_id       uuid REFERENCES public.room_categories(id) ON DELETE SET NULL,
  room_id           uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  guest_name        text NOT NULL,
  guest_phone       text NOT NULL,
  guest_email       text,
  guests            integer NOT NULL DEFAULT 1 CHECK (guests BETWEEN 1 AND 20),
  check_in          date NOT NULL,
  check_out         date NOT NULL,
  nights            integer NOT NULL CHECK (nights >= 1),
  early_option_id   text,
  lines             jsonb NOT NULL DEFAULT '[]'::jsonb,
  amount            numeric(12,2) NOT NULL CHECK (amount >= 0),
  payment_method    text NOT NULL CHECK (payment_method IN ('UPI', 'CASH', 'CARD')),
  payment_reference text,
  paid_at           timestamptz NOT NULL DEFAULT now(),
  bill_order_id     uuid,
  -- The link's token is derived from the server secret, the pass id and this version (so the desk can show the link
  -- again, and bumping the version revokes it); only its hash is stored, for lookup.
  token_version     integer NOT NULL DEFAULT 1,
  token_hash        text NOT NULL,
  idempotency_key   text,
  expires_at        timestamptz NOT NULL,
  status            text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'used', 'void')),
  used_room_id      uuid,
  used_at           timestamptz,
  issued_by         text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS stay_passes_token_hash_key ON public.stay_passes (token_hash);
CREATE UNIQUE INDEX IF NOT EXISTS stay_passes_idem_key ON public.stay_passes (business_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
-- One live pass per reservation: a second bill for the same booking is refused unless the first is voided.
CREATE UNIQUE INDEX IF NOT EXISTS stay_passes_one_live_per_booking ON public.stay_passes (booking_id) WHERE booking_id IS NOT NULL AND status <> 'void';
CREATE INDEX IF NOT EXISTS stay_passes_business_idx ON public.stay_passes (business_id, created_at DESC);

ALTER TABLE public.stay_passes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stay_passes FROM anon, authenticated;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS advance_paid          numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stay_extras           jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS late_checkout_request jsonb;

ALTER TABLE public.room_stay_logs
  ADD COLUMN IF NOT EXISTS advance_paid numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS stay_policies jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.stay_booking_requests
  ADD COLUMN IF NOT EXISTS expected_arrival text;

COMMIT;

NOTIFY pgrst, 'reload schema';

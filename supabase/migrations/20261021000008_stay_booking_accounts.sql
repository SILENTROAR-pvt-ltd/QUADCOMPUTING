-- ============================================================================
-- A reservation made while signed in to a Vibers ID is linked to that guest account, so the guest's name and mobile
-- come from the account and their bookings can be found again. Additive and idempotent.
-- ============================================================================
BEGIN;

ALTER TABLE public.stay_booking_requests
  ADD COLUMN IF NOT EXISTS guest_account_id uuid REFERENCES public.guest_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS stay_booking_requests_account_idx
  ON public.stay_booking_requests (guest_account_id) WHERE guest_account_id IS NOT NULL;

COMMIT;

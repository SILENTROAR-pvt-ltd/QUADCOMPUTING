-- Stays: the guest asks to check out from their room page.
--
-- rooms.checkout_request holds the in-house guest's "I am ready to leave" request: {status: 'pending', requested_at,
-- note}. The front desk sees it on the room's card and in the occupied-room box, prepares the bill, settles and checks
-- the guest out (which clears it), or dismisses it. Releasing the room clears it too, so the next guest never inherits one.
-- Server-only, like late_checkout_request: the guest writes it through the room API, never directly.

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS checkout_request jsonb;

COMMENT ON COLUMN public.rooms.checkout_request IS 'The in-house guest''s pending check-out request from their room page: {status, requested_at, note}. Cleared at checkout.';

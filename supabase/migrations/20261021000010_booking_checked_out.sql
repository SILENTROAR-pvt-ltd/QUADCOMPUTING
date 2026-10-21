-- Stays: a reservation ends with the stay.
--
-- Checking a room out used to close its booking by moving check_out to the day the guest left, but a stay that ends on
-- the day it began is refused by the table's own rule (check_out must be after check_in), so same-day stays stayed
-- "checked in" for ever: the guest's Stay tab kept saying "you are checked in" after the bill was settled. A booking
-- now has a status of its own for that: checked_out. It does not hold a room for any date and reads "Stayed".

ALTER TABLE public.stay_booking_requests DROP CONSTRAINT IF EXISTS stay_booking_requests_status_check;
ALTER TABLE public.stay_booking_requests ADD CONSTRAINT stay_booking_requests_status_check
  CHECK (status IN ('requested', 'confirmed', 'declined', 'cancelled', 'checked_in', 'checked_out', 'no_show'));

-- Bookings whose room has already been checked out by the old code: close them now.
UPDATE public.stay_booking_requests b
   SET status = 'checked_out', updated_at = now()
 WHERE b.status = 'checked_in'
   AND b.room_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = b.room_id AND r.status = 'OCCUPIED');

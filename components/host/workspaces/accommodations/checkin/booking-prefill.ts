import type { StayBooking } from '../bookings/useStayBookings';
import { checkoutAfterNights, nowLocalInput } from './check-in-dates';

/**
 * What a reservation fills into the desk's check-in form: the guest as they booked, the party size, and the booked
 * check-out at the standard 11:00. A booking whose check-out date has already passed gets one night from now instead,
 * so the desk is never handed an expected check-out in the past.
 */
export function bookingPrefill(b: StayBooking, now = nowLocalInput()) {
  const booked = `${b.check_out}T11:00`;
  return {
    guestName: b.guest_name,
    guestPhone: b.guest_phone,
    guestEmail: b.guest_email || '',
    adults: String(Math.max(1, b.guests || 1)),
    checkOutTime: booked > now ? booked : checkoutAfterNights(now, 1),
  };
}

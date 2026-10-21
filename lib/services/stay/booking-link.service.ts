// A reservation that becomes a stay. Shared by the three ways a guest arrives with a booking: self check-in with the
// code, the desk opening the booking from the Bookings tab, and the desk picking the booking from a vacant room.
// The table is server-only (RLS on, no client grants), so callers pass the service-role client.

export const OPEN_BOOKING = ['requested', 'confirmed'] as const;

export interface OpenBooking {
  id: string; business_id: string; category_id: string; check_in: string; check_out: string; guests: number;
  guest_name: string; guest_phone: string; guest_email: string | null; confirmation_code: string | null; status: string;
  /** The Vibers ID the guest reserved with, when they were signed in (migration 20261021000008). */
  guest_account_id?: string | null;
}

/** The venue's booking if it can still become a stay; null when it is missing, another venue's, or already used. */
export async function loadOpenBooking(db: any, businessId: string, bookingId: string): Promise<OpenBooking | null> {
  const { data, error } = await db.from('stay_booking_requests').select('*')
    .eq('id', bookingId).eq('business_id', businessId).in('status', [...OPEN_BOOKING]).maybeSingle();
  if (error) throw error;
  return data || null;
}

/** Marks the booking as checked in to this room. Conditional on it still being open, so two desks cannot both use it. */
export async function linkBookingToStay(db: any, bookingId: string, roomId: string, nowIso = new Date().toISOString()): Promise<boolean> {
  const { data, error } = await db.from('stay_booking_requests')
    .update({ status: 'checked_in', room_id: roomId, updated_at: nowIso })
    .eq('id', bookingId).in('status', [...OPEN_BOOKING]).select('id').maybeSingle();
  if (error) { console.error('[booking link] could not mark the booking checked in', error.message); return false; }
  return Boolean(data);
}

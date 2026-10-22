// "A guest reserved a room": one call on the host's bell (type STAY_BOOKING), so the desk hears about it at once instead
// of finding it in the bookings list later. The floor ping on staff_notifications carries it to every host screen.
// Best effort: a reservation never fails because its bell could not ring.

export interface NewReservation {
  code: string; guestName: string; roomType: string; checkIn: string; checkOut: string; nights: number; guests: number;
}

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** What the bell says: who (first name only), which room type, when, and the code to find the booking by. */
export function reservationMessage(r: NewReservation): string {
  const first = r.guestName.trim().split(/\s+/)[0] || 'A guest';
  const nights = `${r.nights} night${r.nights === 1 ? '' : 's'}`;
  const guests = `${r.guests} guest${r.guests === 1 ? '' : 's'}`;
  return `${first} · ${r.roomType} · ${day(r.checkIn)} → ${day(r.checkOut)} (${nights}, ${guests}) · ${r.code}`.slice(0, 140);
}

/** Rings the bell for a guest's new reservation. Returns whether the call was stored. */
export async function ringNewReservation(db: any, businessId: string, r: NewReservation, now = new Date()): Promise<boolean> {
  const { error } = await db.from('staff_notifications').insert({
    business_id: businessId, table_number: null, notification_type: 'STAY_BOOKING',
    message: reservationMessage(r), status: 'PENDING', created_at: now.toISOString(),
  });
  if (error) {
    // Until migration 20261022000006 is applied the database refuses the type; the booking itself is already saved.
    console.error('[stay booking] the reservation bell did not ring:', error.message);
    return false;
  }
  return true;
}

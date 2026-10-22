import { nightsBetween } from './stay-booking.service';

// A guest's reservations, made under their Vibers ID, at this venue or everywhere the same login is connected: read by
// the menu's Stay tile and the Me tab. The room this phone is in now is in stay-hub-room.service.ts.

export type { MyRoom } from './stay-hub-room.service';
export { findMyRoom, venueStaySummary } from './stay-hub-room.service';

export type StayState = 'requested' | 'upcoming' | 'in_house' | 'stayed' | 'missed' | 'cancelled' | 'declined' | 'no_show';

/** Where a reservation stands in the guest's words, from its status and today's date. */
export function stayState(b: { status: string; check_out: string }, today: string): StayState {
  const over = b.check_out <= today;
  switch (b.status) {
    case 'confirmed': return over ? 'missed' : 'upcoming';
    case 'checked_in': return over ? 'stayed' : 'in_house';
    case 'checked_out': return 'stayed';
    case 'requested': return 'requested';
    case 'cancelled': case 'declined': case 'no_show': return b.status;
    default: return over ? 'stayed' : 'upcoming';
  }
}

export interface GuestStay {
  id: string; code: string | null; state: StayState; check_in: string; check_out: string; nights: number; guests: number;
  room_type: string | null; venue: { id: string; name: string; slug: string | null };
  /** The desk has taken the room payment, so the guest's self check-in is open. */
  paid?: boolean;
}

/** Which of these bookings the desk has been paid for (a live or used pass). A failed read reports none paid. */
async function paidBookingIds(db: any, bookingIds: string[]): Promise<Set<string>> {
  if (!bookingIds.length) return new Set();
  try {
    const { data, error } = await db.from('stay_passes').select('booking_id, status').in('booking_id', bookingIds).in('status', ['issued', 'used']);
    if (error) return new Set();
    return new Set((data || []).map((p: any) => String(p.booking_id)));
  } catch { return new Set(); }
}

/** The reservations made under this guest's Vibers ID: at one venue, or at every venue the same login is connected to. */
export async function staysForAccount(
  db: any, account: { id: string; user_id?: string | null }, opts: { businessId?: string | null; limit?: number }, today: string,
): Promise<GuestStay[]> {
  let ids = [account.id];
  if (account.user_id) {
    const { data: siblings, error } = await db.from('guest_accounts').select('id').eq('user_id', account.user_id);
    if (error) throw error;
    ids = Array.from(new Set([...ids, ...(siblings || []).map((s: any) => String(s.id))]));
  }
  let q = db.from('stay_booking_requests')
    .select('id, business_id, confirmation_code, status, check_in, check_out, guests, category:room_categories(name), business:businesses(id, business_name, name, slug)')
    .in('guest_account_id', ids).order('check_in', { ascending: false }).limit(opts.limit || 20);
  if (opts.businessId) q = q.eq('business_id', opts.businessId);
  const { data, error } = await q;
  if (error) throw error;
  const paid = await paidBookingIds(db, (data || []).filter((b: any) => b.status === 'confirmed' || b.status === 'requested').map((b: any) => String(b.id)));
  // What matters now comes first: the stay the guest is in, then what is coming, then the past.
  const rank: Record<StayState, number> = { in_house: 0, upcoming: 1, requested: 2, stayed: 3, missed: 4, cancelled: 5, declined: 5, no_show: 5 };
  return (data || []).map((b: any): GuestStay => ({
    id: b.id, code: b.confirmation_code || null, state: stayState(b, today), paid: paid.has(String(b.id)), check_in: b.check_in, check_out: b.check_out,
    nights: Math.max(0, nightsBetween(b.check_in, b.check_out)), guests: Number(b.guests) || 1, room_type: b.category?.name || null,
    venue: { id: String(b.business_id), name: b.business?.business_name || b.business?.name || 'Venue', slug: b.business?.slug || null },
  })).sort((a: GuestStay, b: GuestStay) => rank[a.state] - rank[b.state] || (rank[a.state] <= 2 ? a.check_in.localeCompare(b.check_in) : b.check_in.localeCompare(a.check_in)));
}

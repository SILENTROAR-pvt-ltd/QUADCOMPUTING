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
  return (data || []).map((b: any): GuestStay => ({
    id: b.id, code: b.confirmation_code || null, state: stayState(b, today), check_in: b.check_in, check_out: b.check_out,
    nights: Math.max(0, nightsBetween(b.check_in, b.check_out)), guests: Number(b.guests) || 1, room_type: b.category?.name || null,
    venue: { id: String(b.business_id), name: b.business?.business_name || b.business?.name || 'Venue', slug: b.business?.slug || null },
  }));
}

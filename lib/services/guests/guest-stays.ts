import { stayNights } from '@/lib/services/accommodation/stay-folio.util';
import { normalizePhone } from '@/lib/services/live-events/guest-key';

/** A guest's stays at the venue, from the stay log, keyed by the phone given at check-in. */
export interface GuestStays { stays: number; nights: number; last_stay_at: string | null }

/**
 * Stays per phone from the room stay logs: how many times a guest has stayed, how many nights, and when they last
 * checked in. The ledger keys walk-in guests by the same ten digits, so a guest's row in My Guests gets their stays.
 */
export function staysByPhone(logs: Array<{ guest_phone?: string | null; check_in_time?: string | null; check_out_time?: string | null }>): Map<string, GuestStays> {
  const out = new Map<string, GuestStays>();
  for (const l of logs) {
    const phone = normalizePhone(l.guest_phone);
    if (!phone) continue;
    const row = out.get(phone) ?? { stays: 0, nights: 0, last_stay_at: null };
    row.stays += 1;
    row.nights += stayNights(l.check_in_time, l.check_out_time || undefined);
    if (l.check_in_time && (!row.last_stay_at || l.check_in_time > row.last_stay_at)) row.last_stay_at = l.check_in_time;
    out.set(phone, row);
  }
  return out;
}

/** Reads the venue's stay logs and attaches each guest's stays to their ledger row (by phone). Unreadable logs attach nothing. */
export async function attachGuestStays<T extends { phone?: string | null }>(db: any, businessId: string, guests: T[]): Promise<Array<T & GuestStays>> {
  let logs: any[] = [];
  try {
    const { data } = await db.from('room_stay_logs').select('guest_phone, check_in_time, check_out_time').eq('business_id', businessId).limit(5000);
    logs = data || [];
  } catch { /* a venue without rooms, or a stay log that cannot be read: guests still list */ }
  const by = staysByPhone(logs);
  return guests.map((g) => ({ ...g, ...(by.get(normalizePhone(g.phone) || '') ?? { stays: 0, nights: 0, last_stay_at: null }) }));
}

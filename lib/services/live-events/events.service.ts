import { seatsLeft, type Booked } from './party';

/** Events still worth showing: not cancelled, and not over for more than a few hours. */
const GRACE_MS = 3 * 60 * 60 * 1000;
const DEFAULT_LENGTH_MS = 4 * 60 * 60 * 1000;

export interface PublicEvent {
  id: string; title: string; description: string | null; banner_url: string | null; category: string;
  starts_at: string; ends_at: string | null; entry_fee: number; perks: string[];
  /** Seats left in the whole pool, and (only when the host split it) for men and for women. null = no limit. */
  spots_left: number | null; spots_left_men: number | null; spots_left_women: number | null; has_split: boolean;
  is_live_now: boolean;
}

const endOf = (e: { starts_at: string; ends_at: string | null }) => Date.parse(e.ends_at || '') || Date.parse(e.starts_at) + DEFAULT_LENGTH_MS;

/** Seats already promised to each event: every party that has not been declined, in all and by gender. */
export async function bookedSeats(db: any, eventIds: string[]): Promise<Map<string, Booked>> {
  const seats = new Map<string, Booked>();
  if (eventIds.length === 0) return seats;
  const { data } = await db.from('event_guest_leads').select('event_id, party_size, party_male, party_female, status').in('event_id', eventIds).neq('status', 'DECLINED');
  for (const r of data || []) {
    const b = seats.get(r.event_id) || { total: 0, male: 0, female: 0 };
    b.total += Number(r.party_size || 0); b.male += Number(r.party_male || 0); b.female += Number(r.party_female || 0);
    seats.set(r.event_id, b);
  }
  return seats;
}

export const NONE: Booked = { total: 0, male: 0, female: 0 };

/** The venue's upcoming and running events, soonest first, in the shape a guest's phone needs (no host-only fields). */
export async function listPublicEvents(db: any, businessId: string, now = Date.now()): Promise<PublicEvent[]> {
  const { data, error } = await db.from('venue_live_events').select('*').eq('business_id', businessId).eq('status', 'LIVE')
    .gte('starts_at', new Date(now - 24 * 60 * 60 * 1000).toISOString()).order('starts_at', { ascending: true }).limit(40);
  if (error) throw error;
  const rows = (data || []).filter((e: any) => endOf(e) + GRACE_MS > now);
  const booked = await bookedSeats(db, rows.map((e: any) => e.id));
  return rows.map((e: any) => {
    const left = seatsLeft({ capacity: e.capacity ?? null, male_capacity: e.male_capacity ?? null, female_capacity: e.female_capacity ?? null }, booked.get(e.id) || NONE);
    const split = e.male_capacity != null || e.female_capacity != null;
    return {
      id: e.id, title: e.title, description: e.description, banner_url: e.banner_url, category: e.category,
      starts_at: e.starts_at, ends_at: e.ends_at, entry_fee: Number(e.entry_fee) || 0, perks: e.perks || [],
      spots_left: left.total, spots_left_men: split ? left.male : null, spots_left_women: split ? left.female : null, has_split: split,
      is_live_now: Date.parse(e.starts_at) <= now && endOf(e) > now,
    };
  });
}

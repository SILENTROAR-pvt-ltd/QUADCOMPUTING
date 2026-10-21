// Reserved rooms on the front desk. A booking is for a room type, not a numbered room (the room is chosen at check-in),
// so "reserved" is shown, not stored: for each room type, as many free rooms as there are bookings due now are marked
// Reserved, lowest room numbers first, paid bookings first. Nothing is written, so a cancelled booking frees its room at
// once and the guest's choice of room is never constrained.

export interface ReservationLite {
  id: string; category_id: string; check_in: string; check_out: string; status: string; guest_name: string;
  confirmation_code: string | null; guests: number; created_at?: string; pass?: { status: string; amount: number } | null; expected_arrival?: string | null;
}
export interface RoomLite { id: string; category_id: string; room_number: string; status: string }

const OPEN = new Set(['requested', 'confirmed']);
const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

/** A booking is due now when its stay has begun (or begins today) and has not ended: the guest is expected, or overdue. */
export const isDueNow = (b: Pick<ReservationLite, 'check_in' | 'check_out' | 'status'>, today: string) =>
  OPEN.has(b.status) && b.check_in <= today && b.check_out > today;

/** Which free room each due booking holds: a map of room id to its booking. */
export function assignReservedRooms<R extends RoomLite, B extends ReservationLite>(rooms: R[], bookings: B[], today: string): Map<string, B> {
  const held = new Map<string, B>();
  const due = bookings.filter((b) => isDueNow(b, today));
  const byCategory = new Map<string, B[]>();
  for (const b of due) byCategory.set(b.category_id, [...(byCategory.get(b.category_id) || []), b]);

  for (const [categoryId, list] of Array.from(byCategory.entries())) {
    const free = rooms.filter((r) => r.category_id === categoryId && r.status === 'VACANT').sort((a, b) => natural(a.room_number, b.room_number));
    // Paid first (their room is settled), then the earliest arrival, then the earliest booked.
    const ordered = [...list].sort((a, b) => Number(Boolean(b.pass)) - Number(Boolean(a.pass)) || a.check_in.localeCompare(b.check_in) || String(a.created_at || '').localeCompare(String(b.created_at || '')));
    ordered.slice(0, free.length).forEach((b, i) => held.set(free[i].id, b));
  }
  return held;
}

/** Bookings expected within the next `days` days (today included), soonest first, for the arrivals strip. */
export function upcomingArrivals<B extends ReservationLite>(bookings: B[], today: string, days = 3): B[] {
  const end = new Date(`${today}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + days);
  const last = end.toISOString().slice(0, 10);
  return bookings.filter((b) => OPEN.has(b.status) && b.check_out > today && b.check_in <= last)
    .sort((a, b) => a.check_in.localeCompare(b.check_in) || a.guest_name.localeCompare(b.guest_name));
}

export const arrivalLabel = (checkIn: string, today: string) => {
  if (checkIn <= today) return checkIn < today ? 'Overdue' : 'Today';
  const t = new Date(`${today}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + 1);
  return checkIn === t.toISOString().slice(0, 10) ? 'Tomorrow' : new Date(`${checkIn}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

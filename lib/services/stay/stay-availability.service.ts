// How many rooms of a category are free for a date range: the rooms that exist, less bookings that overlap the range,
// less rooms whose current guest is still expected on the range's first night.

export const OPEN_BOOKING_STATUSES = ['requested', 'confirmed'];

export interface RangeAvailability {
  total: number;
  booked: number;
  occupied: number;
  available: number;
  vacantNow: number;
}

interface RoomRow { id: string; status?: string | null; check_out_date?: string | null; check_out_time?: string | null }
interface BookingRow { check_in: string; check_out: string }

/** [aStart, aEnd) and [bStart, bEnd) share at least one night. Dates are YYYY-MM-DD and compare as text. */
export const nightsOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) => aStart < bEnd && bStart < aEnd;

/** A room with a guest in it still holds the range's first night unless its expected check-out is on or before it. */
export function occupiedOnDate(room: RoomRow, date: string): boolean {
  if (String(room.status || '').toUpperCase() !== 'OCCUPIED') return false;
  const out = room.check_out_time || room.check_out_date;
  return !out || String(out).slice(0, 10) > date;
}

export function availabilityFromRows(rooms: RoomRow[], bookings: BookingRow[], checkIn: string, checkOut: string): RangeAvailability {
  const usable = rooms.filter((r) => String(r.status || '').toUpperCase() !== 'MAINTENANCE');
  const occupied = usable.filter((r) => occupiedOnDate(r, checkIn)).length;
  const booked = bookings.filter((b) => nightsOverlap(checkIn, checkOut, b.check_in, b.check_out)).length;
  const vacantNow = usable.filter((r) => String(r.status || '').toUpperCase() === 'VACANT').length;
  return { total: usable.length, booked, occupied, available: Math.max(0, usable.length - booked - occupied), vacantNow };
}

async function rows(db: any, businessId: string, categoryId: string) {
  const [{ data: rooms, error: roomsErr }, { data: bookings, error: bookingsErr }] = await Promise.all([
    db.from('rooms').select('id, status, check_out_date, check_out_time').eq('business_id', businessId).eq('category_id', categoryId),
    db.from('stay_booking_requests').select('id, check_in, check_out, created_at').eq('business_id', businessId).eq('category_id', categoryId).in('status', OPEN_BOOKING_STATUSES),
  ]);
  if (roomsErr) throw roomsErr;
  if (bookingsErr) throw bookingsErr;
  return { rooms: (rooms || []) as RoomRow[], bookings: (bookings || []) as Array<BookingRow & { id: string; created_at?: string }> };
}

export async function categoryAvailability(db: any, businessId: string, categoryId: string, checkIn: string, checkOut: string): Promise<RangeAvailability> {
  const r = await rows(db, businessId, categoryId);
  return availabilityFromRows(r.rooms, r.bookings, checkIn, checkOut);
}

/**
 * Whether a booking just written is one more than the type can hold on its nights. Two guests taking the last room in
 * the same instant both pass the check before writing; afterwards each is ranked among the bookings overlapping it,
 * earliest written first, and the one past the rooms that exist is the one to withdraw.
 */
export async function overbooked(db: any, businessId: string, categoryId: string, booking: { id: string; check_in: string; check_out: string }): Promise<boolean> {
  const r = await rows(db, businessId, categoryId);
  const a = availabilityFromRows(r.rooms, r.bookings, booking.check_in, booking.check_out);
  const capacity = a.total - a.occupied;
  if (a.booked <= capacity) return false;
  const overlapping = r.bookings
    .filter((b) => nightsOverlap(booking.check_in, booking.check_out, b.check_in, b.check_out))
    .sort((x, y) => String(x.created_at || '').localeCompare(String(y.created_at || '')) || String(x.id).localeCompare(String(y.id)));
  return overlapping.findIndex((b) => b.id === booking.id) >= capacity;
}

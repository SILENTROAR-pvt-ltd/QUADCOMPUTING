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

export async function categoryAvailability(db: any, businessId: string, categoryId: string, checkIn: string, checkOut: string): Promise<RangeAvailability> {
  const [{ data: rooms, error: roomsErr }, { data: bookings, error: bookingsErr }] = await Promise.all([
    db.from('rooms').select('id, status, check_out_date, check_out_time').eq('business_id', businessId).eq('category_id', categoryId),
    db.from('stay_booking_requests').select('check_in, check_out').eq('business_id', businessId).eq('category_id', categoryId).in('status', OPEN_BOOKING_STATUSES),
  ]);
  if (roomsErr) throw roomsErr;
  if (bookingsErr) throw bookingsErr;
  return availabilityFromRows(rooms || [], bookings || [], checkIn, checkOut);
}

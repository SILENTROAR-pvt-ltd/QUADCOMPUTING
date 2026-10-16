import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { createReservation, ReservationError } from '@/lib/services/reservations/reservations.service';
import { getAvailableSlotsForDate, getVenueStatus, todayIst } from '@/lib/services/reservations/venue-hours.service';

export const dynamic = 'force-dynamic';

const nowIstTime = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(11, 16);

/** POST /api/guest/reserve: book a table for one slot. The database picks or confirms the table atomically. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const validation = await validateGuestAccess(body.cafe_id ?? body.venue_id ?? '');
  if (validation.error) return validation.error;

  const limited = await enforceRateLimit(request, 'guest_reserve', 10, 60_000, validation.businessId);
  if (limited) return limited;

  const db = adminDb();
  const date = String(body.reserved_date ?? '');
  const time = String(body.reserved_time ?? '');

  const status = await getVenueStatus(db, validation.businessId);
  if (!status.reservationsEnabled) return NextResponse.json({ error: 'Reservations are not open at this venue.' }, { status: 400 });

  const slots = await getAvailableSlotsForDate(db, validation.businessId, date);
  if (!slots.includes(time)) return NextResponse.json({ error: 'That time is outside opening hours.' }, { status: 400 });
  if (date === todayIst() && time <= nowIstTime()) return NextResponse.json({ error: 'That time has already passed today.' }, { status: 400 });

  try {
    const reservation = await createReservation(db, validation.businessId, {
      guestName: String(body.guest_name ?? ''),
      guestPhone: String(body.guest_phone ?? ''),
      partySize: Number(body.party_size),
      reservedDate: date,
      reservedTime: time,
      tableId: typeof body.table_id === 'string' && body.table_id ? body.table_id : null,
      notes: typeof body.notes === 'string' ? body.notes : '',
    });
    return NextResponse.json({ success: true, reservation }, { status: 201 });
  } catch (err) {
    if (err instanceof ReservationError) {
      const httpStatus = err.code === 'INVALID' ? 400 : err.code === 'FAILED' ? 500 : 409;
      return NextResponse.json({ error: err.message, code: err.code }, { status: httpStatus });
    }
    throw err;
  }
}, 'GuestReservePOST');

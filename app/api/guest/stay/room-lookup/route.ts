import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { phoneMatches, stayStartedAt } from '@/lib/services/stay/room-access.service';
import { issueRoomSession, roomCookieName, roomCookieOptions } from '@/lib/services/stay/room-session';
import { ensureRoomCode, loadStayBusiness } from '@/lib/services/stay/room-route.util';

export const dynamic = 'force-dynamic';

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, '');
const NO_MATCH = () => NextResponse.json({ success: false, error: 'We could not match that room and number. Check them, or use the QR card in your room.', code: 'NO_MATCH' }, { status: 404 });

/**
 * POST /api/guest/stay/room-lookup { venue, room_number, phone_last4 }
 * A hotel guest on the venue's menu ("Room delivery") or on its stay page ("My room"): the room number and the last four
 * digits of the phone given at check-in find their room and confirm this phone, exactly as the room's own page does. A
 * few tries per quarter hour per address, and one answer for every kind of mismatch, so room numbers cannot be probed.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const validation = await validateGuestAccess(body?.venue ?? body?.cafe_id ?? '');
    if (validation.error) return validation.error;
    const businessId = validation.businessId;

    const limited = await enforceRateLimit(request, 'room_lookup', 8, 15 * 60_000, businessId);
    if (limited) return limited;

    const db = adminDb();
    // The venue must exist and offer stays; whether it delivers food to rooms is the room page's and the menu's
    // business (the guest still needs their bill, services and the desk when dining is off).
    const business = await loadStayBusiness(db, businessId);
    if (!business) return NextResponse.json({ success: false, error: 'This venue was not found.', code: 'NOT_FOUND' }, { status: 404 });

    const { data: rooms, error } = await db.from('rooms').select('id, business_id, category_id, room_number, guest_phone, check_in_time, check_in_date, qr_code_hash')
      .eq('business_id', businessId).eq('status', 'OCCUPIED');
    if (error) throw error;
    const room = (rooms || []).find((r: any) => norm(r.room_number) === norm(body?.room_number));
    if (!room || !phoneMatches(room, body?.phone_last4)) return NO_MATCH();

    const token = issueRoomSession(room.id, businessId, stayStartedAt(room) || '');
    if (!token) return NextResponse.json({ success: false, error: 'Room sessions are not configured.' }, { status: 503 });
    const code = await ensureRoomCode(db, room);
    const response = NextResponse.json({ success: true, room_code: code, room_number: room.room_number }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(roomCookieName(room.id), token, roomCookieOptions);
    return response;
  } catch (error) {
    return handleApiError(error, request, 'StayRoomLookupPOST');
  }
}, 'StayRoomLookupPOST');

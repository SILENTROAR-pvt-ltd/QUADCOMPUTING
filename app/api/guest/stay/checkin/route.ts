import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { todayIst } from '@/lib/services/reservations/venue-hours.service';
import { readSelfCheckInInput, selfCheckIn, SelfCheckInError } from '@/lib/services/stay/self-checkin.service';
import { idProofBelongsTo } from '@/lib/services/stay/id-proof.service';
import { issueRoomSession, roomCookieName, roomCookieOptions } from '@/lib/services/stay/room-session';
import { publicRoom, stayStartedAt } from '@/lib/services/stay/room-access.service';
import { checkoutHour, ensureRoomCode, loadStayBusiness } from '@/lib/services/stay/room-route.util';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, number> = { INVALID: 400, NOT_FOUND: 404, NO_ROOM: 409, FAILED: 500 };

/**
 * POST /api/guest/stay/checkin
 * A guest at the property takes a vacant room of the type they chose. Opens the same stay folio the front desk
 * opens, marks the room as a self check-in for the host to review, and hands the browser the room's session.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const validation = await validateGuestAccess(body?.venue ?? body?.cafe_id ?? '');
    if (validation.error) return validation.error;
    const businessId = validation.businessId;

    const limited = await enforceRateLimit(request, 'stay_checkin', 5, 10 * 60_000, businessId);
    if (limited) return limited;

    const db = adminDb();
    const business = await loadStayBusiness(db, businessId);
    if (!business?.self_checkin_enabled) {
      return NextResponse.json({ success: false, error: 'Self check-in is not open at this venue. Please come to the desk.', code: 'SELF_CHECKIN_OFF' }, { status: 403 });
    }

    const input = readSelfCheckInInput(body);
    if (input.idProofPath && !idProofBelongsTo(input.idProofPath, businessId)) {
      return NextResponse.json({ success: false, error: 'The ID photo upload is not valid.', code: 'INVALID' }, { status: 400 });
    }

    const result = await selfCheckIn(db, businessId, input, { today: todayIst(), checkoutTime: checkoutHour(business.checkout_time) });
    const code = await ensureRoomCode(db, result.room);

    const response = NextResponse.json({
      success: true,
      room_code: code,
      room: publicRoom(result.room),
      booking_code: result.booking?.confirmation_code || null,
      warning: result.folioWarning,
    }, { headers: { 'Cache-Control': 'no-store' } });
    const token = issueRoomSession(result.room.id, businessId, stayStartedAt(result.room) || '');
    if (token) response.cookies.set(roomCookieName(result.room.id), token, roomCookieOptions);
    return response;
  } catch (error) {
    if (error instanceof SelfCheckInError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: STATUS[error.code] || 500 });
    }
    return handleApiError(error, request, 'StayCheckInPOST');
  }
}, 'StayCheckInPOST');

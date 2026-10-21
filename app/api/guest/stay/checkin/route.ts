import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { todayIst } from '@/lib/services/reservations/venue-hours.service';
import { readSelfCheckInInput, SelfCheckInError } from '@/lib/services/stay/self-checkin.service';
import { checkInWithPass } from '@/lib/services/stay/pass-checkin.service';
import { loadPassByToken, StayPassError } from '@/lib/services/stay/stay-pass.service';
import { idProofBelongsTo } from '@/lib/services/stay/id-proof.service';
import { issueRoomSession, roomCookieName, roomCookieOptions } from '@/lib/services/stay/room-session';
import { publicRoom, stayStartedAt } from '@/lib/services/stay/room-access.service';
import { checkoutHour, ensureRoomCode, loadStayBusiness } from '@/lib/services/stay/room-route.util';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, number> = { INVALID: 400, NOT_FOUND: 404, NO_ROOM: 409, FAILED: 500, CONFLICT: 409, USED: 409, VOID: 410, EXPIRED: 410 };

/**
 * POST /api/guest/stay/checkin { venue, pass_token, guest_name, id_type, id_number?, id_proof_path?, ... }
 * A guest checks themselves in with the pass the desk issued after taking the room payment. The pass fixes the room
 * type, dates, phone and what was paid; the guest adds the ID. Opens the same stay folio the front desk opens, with
 * the advance on it, marks the room for the desk to review the ID, and hands the browser the room's session.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const validation = await validateGuestAccess(body?.venue ?? body?.cafe_id ?? '');
    if (validation.error) return validation.error;
    const businessId = validation.businessId;

    const limited = await enforceRateLimit(request, 'stay_checkin', 8, 10 * 60_000, businessId);
    if (limited) return limited;

    const db = adminDb();
    const business = await loadStayBusiness(db, businessId);
    if (!business?.self_checkin_enabled) {
      return NextResponse.json({ success: false, error: 'Self check-in is not open at this venue. Please come to the desk.', code: 'SELF_CHECKIN_OFF' }, { status: 403 });
    }

    const pass = await loadPassByToken(db, body?.pass_token);
    const input = readSelfCheckInInput(body);
    if (input.idProofPath && !idProofBelongsTo(input.idProofPath, businessId)) {
      return NextResponse.json({ success: false, error: 'The ID photo upload is not valid.', code: 'INVALID' }, { status: 400 });
    }

    const result = await checkInWithPass(db, businessId, pass, {
      guestName: input.guestName, guestEmail: input.guestEmail, guests: input.totalGuests, idType: input.idType, idNumber: input.idNumber, idProofPath: input.idProofPath,
      dpdpConsentAccepted: input.dpdpConsentAccepted, consentTimestamp: input.consentTimestamp, isForeignNational: input.isForeignNational,
      passportNumber: input.passportNumber, visaNumber: input.visaNumber, countryOfOrigin: input.countryOfOrigin, visaExpiryDate: input.visaExpiryDate,
    }, { today: todayIst(), checkoutTime: checkoutHour(business.checkout_time) });
    const code = await ensureRoomCode(db, result.room);

    const response = NextResponse.json({
      success: true, room_code: code, room: publicRoom(result.room, true), warning: result.folioWarning,
    }, { headers: { 'Cache-Control': 'no-store' } });
    const token = issueRoomSession(result.room.id, businessId, stayStartedAt(result.room) || '');
    if (token) response.cookies.set(roomCookieName(result.room.id), token, roomCookieOptions);
    return response;
  } catch (error) {
    if (error instanceof SelfCheckInError || error instanceof StayPassError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: STATUS[error.code] || 500 });
    }
    return handleApiError(error, request, 'StayCheckInPOST');
  }
}, 'StayCheckInPOST');

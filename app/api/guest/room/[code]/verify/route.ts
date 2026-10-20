import { NextResponse } from 'next/server';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { isOccupied, phoneMatches, stayStartedAt } from '@/lib/services/stay/room-access.service';
import { issueRoomSession, roomCookieName, roomCookieOptions } from '@/lib/services/stay/room-session';
import { noStay, roomContext } from '@/lib/services/stay/room-route.util';

export const dynamic = 'force-dynamic';

/**
 * POST /api/guest/room/[code]/verify { phone_last4 }
 * The guest proves the room is theirs with the last four digits of the phone given at check-in. A few tries per
 * quarter hour per address; the answer never says which digits were wrong.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const limited = await enforceRateLimit(request, 'room_verify', 8, 15 * 60_000, code);
    if (limited) return limited;

    const ctx = await roomContext(request, code);
    if (!ctx.ok) return ctx.response;
    const { stay } = ctx;
    if (!isOccupied(stay.room)) return noStay();

    const body = await request.json().catch(() => ({}));
    if (!phoneMatches(stay.room, body?.phone_last4)) {
      return NextResponse.json({ success: false, error: 'Those digits do not match the phone given at check-in.', code: 'ROOM_VERIFY_FAILED' }, { status: 401 });
    }

    const token = issueRoomSession(stay.room.id, stay.business.id, stayStartedAt(stay.room) || '');
    if (!token) return NextResponse.json({ success: false, error: 'Room sessions are not configured.' }, { status: 503 });
    const response = NextResponse.json({ success: true, verified: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(roomCookieName(stay.room.id), token, roomCookieOptions);
    return response;
  } catch (error) {
    return handleApiError(error, request, 'GuestRoomVerifyPOST');
  }
}, 'GuestRoomVerifyPOST');

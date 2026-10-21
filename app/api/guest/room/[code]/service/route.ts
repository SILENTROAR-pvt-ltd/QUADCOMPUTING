import { NextResponse } from 'next/server';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { cleanCallMessage, recordStaffCall, type CallType } from '@/lib/services/guest/staff-call.service';
import { isOccupied } from '@/lib/services/stay/room-access.service';
import { noStay, notVerified, roomContext } from '@/lib/services/stay/room-route.util';

export const dynamic = 'force-dynamic';

// One-tap requests from the room. Each is a staff notification the host console already rings for.
// (Not exported: a route module may only export handlers, or the production build fails.)
const ROOM_REQUESTS: Record<string, { type: CallType; message: string }> = {
  housekeeping: { type: 'SERVICE', message: 'Housekeeping, please' },
  water: { type: 'WAITER', message: 'Extra drinking water, please' },
  towels: { type: 'SERVICE', message: 'Extra towels, please' },
  front_desk: { type: 'SERVICE', message: 'Front desk: please call the room' },
  custom: { type: 'SERVICE', message: '' },
};

/** POST /api/guest/room/[code]/service { kind, message? } */
export const POST = withApiErrorBoundary(async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const limited = await enforceRateLimit(request, 'room_service', 20, 10 * 60_000, code);
    if (limited) return limited;

    const ctx = await roomContext(request, code);
    if (!ctx.ok) return ctx.response;
    const { db, stay, verified } = ctx;
    if (!isOccupied(stay.room)) return noStay();
    if (!verified) return notVerified();

    const body = await request.json().catch(() => ({}));
    const preset = ROOM_REQUESTS[String(body?.kind || '')];
    if (!preset) return NextResponse.json({ success: false, error: 'Choose a request.' }, { status: 400 });
    const message = preset.message || cleanCallMessage(body?.message);
    if (!message) return NextResponse.json({ success: false, error: 'Tell us what you need.' }, { status: 400 });

    const result = await recordStaffCall(db, { businessId: stay.business.id, tableNumber: `ROOM ${stay.room.room_number}`, type: preset.type, message });
    if (!result.ok) {
      console.error('[room service] notification not stored:', result.error);
      return NextResponse.json({ success: false, error: 'Could not reach the desk. Please try again.' }, { status: 502 });
    }
    return NextResponse.json({ success: true, duplicate: result.duplicate }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'GuestRoomServicePOST');
  }
}, 'GuestRoomServicePOST');

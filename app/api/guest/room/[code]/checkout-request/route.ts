import { NextResponse } from 'next/server';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { isOccupied } from '@/lib/services/stay/room-access.service';
import { noStay, notVerified, roomContext } from '@/lib/services/stay/room-route.util';
import { requestRoomCheckout } from '@/lib/services/stay/checkout-request.service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/guest/room/[code]/checkout-request { action: 'request' | 'cancel', note? }
 * The guest is ready to leave: the desk is told to prepare the bill. Settlement and the checkout itself happen at the
 * desk, where the bill is paid; nothing is charged here.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const limited = await enforceRateLimit(request, 'room_checkout_request', 10, 10 * 60_000, code);
    if (limited) return limited;

    const ctx = await roomContext(request, code);
    if (!ctx.ok) return ctx.response;
    const { db, stay, verified } = ctx;
    if (!isOccupied(stay.room)) return noStay();
    if (!verified) return notVerified();

    const body = await request.json().catch(() => ({}));
    const action = body?.action === 'cancel' ? 'cancel' : 'request';
    const result = await requestRoomCheckout(db, stay, action, body?.note);
    if (!result.ok) {
      return result.code === 'NO_STAY' ? noStay() : NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true, request: result.request, duplicate: Boolean(result.duplicate) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'GuestRoomCheckoutRequestPOST');
  }
}, 'GuestRoomCheckoutRequestPOST');

import { NextResponse } from 'next/server';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { checkGuestOrderRateLimit, getClientIp, rateLimitResponse } from '@/lib/middleware/rate-limiter';
import { withIdempotency, generateIdempotencyKey } from '@/lib/services/api-idempotency.util';
import { apiError } from '@/lib/utils/api-response';
import { isOccupied } from '@/lib/services/stay/room-access.service';
import { diningMessage, loadDiningWindow } from '@/lib/services/stay/room-dining-hours';
import { placeRoomOrder } from '@/lib/services/stay/room-order.service';
import { noStay, notVerified, roomContext } from '@/lib/services/stay/room-route.util';

export const dynamic = 'force-dynamic';

/**
 * POST /api/guest/room/[code]/order { items, note?, idempotency_key? }
 * Charge to room: the dishes go to the kitchen under the room's name and onto the stay's bill, settled at checkout.
 * Refused outside kitchen hours, when the venue has switched in-room dining off, or before the guest is confirmed.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const ctx = await roomContext(request, code);
    if (!ctx.ok) return ctx.response;
    const { db, stay, verified } = ctx;
    if (!isOccupied(stay.room)) return noStay();
    if (!verified) return notVerified();
    if (stay.business.in_room_dining_enabled === false) {
      return apiError('In-room dining is not offered at this venue.', 'ROOM_DINING_OFF', 403);
    }

    const rate = await checkGuestOrderRateLimit(getClientIp(request), stay.business.id);
    if (!rate.allowed) return rateLimitResponse(rate, 'Too many orders. Please wait a moment.');

    const window = await loadDiningWindow(db, stay.business.id);
    if (!window.open) return apiError(diningMessage(window), 'KITCHEN_CLOSED', 409);

    const { assertVenueBillingAllowed } = await import('@/lib/services/billing/venue-guard.service');
    const billingGuardError = await assertVenueBillingAllowed(stay.business.id, db);
    if (billingGuardError) return billingGuardError;

    const body = await request.json().catch(() => ({}));
    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) return apiError('Add a dish first.', 'INVALID_PAYLOAD', 400);

    const key = generateIdempotencyKey('room_order', `${stay.business.id}:${stay.room.id}`, { items, note: body?.note, idempotency_key: body?.idempotency_key });
    const { response, status } = await withIdempotency(key, async () => {
      const result = await placeRoomOrder(db, {
        business: stay.business, room: stay.room, items, note: body?.note,
        idempotencyKey: typeof body?.idempotency_key === 'string' ? body.idempotency_key : null,
      });
      return { response: result, status: 200 };
    });
    return NextResponse.json(response, { status });
  } catch (error: any) {
    const msg: string = error?.message || '';
    if (error?.status === 409 || /table is closed|ORDER_NOT_FOUND/i.test(msg)) return apiError('The kitchen could not take this order. Please try again.', 'ORDER_REFUSED', 409);
    if (/Missing|No items|Invalid|not on this venue|no longer available/.test(msg)) return apiError(msg, 'INVALID_PAYLOAD', 400);
    if (error?.status === 503) return apiError(msg, 'MENU_UNAVAILABLE', 503);
    return handleApiError(error, request, 'GuestRoomOrderPOST');
  }
}, 'GuestRoomOrderPOST');

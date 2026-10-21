import { NextResponse } from 'next/server';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { checkGuestOrderRateLimit, getClientIp, rateLimitResponse } from '@/lib/middleware/rate-limiter';
import { withIdempotency, generateIdempotencyKey } from '@/lib/services/api-idempotency.util';
import { apiError } from '@/lib/utils/api-response';
import { isOccupied } from '@/lib/services/stay/room-access.service';
import { diningMessage, loadDiningWindow } from '@/lib/services/stay/room-dining-hours';
import { assertDishesOnly } from '@/lib/services/stay/room-dining';
import { placeRoomOrder } from '@/lib/services/stay/room-order.service';
import { noStay, notVerified, roomContext } from '@/lib/services/stay/room-route.util';
import { applyRequestIdentity } from '@/lib/services/guest-auth/request-identity';
import { assertVenueBillingAllowed } from '@/lib/services/billing/venue-guard.service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/guest/room/[code]/order { items, note?, idempotency_key? }
 * Charge to room: the dishes go to the kitchen under the room's name and onto the stay's bill, settled at checkout.
 * Refused outside kitchen hours, when the venue has switched in-room dining off, or before the guest is confirmed.
 * Every check that needs nothing from another runs at once: the limit, the kitchen hours, the venue's standing, who
 * is ordering, and that each line is a dish. The order itself is one atomic write after them.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const [ctx, body] = await Promise.all([roomContext(request, code), request.json().catch(() => ({}))]);
    if (!ctx.ok) return ctx.response;
    const { db, stay, verified } = ctx;
    if (!isOccupied(stay.room)) return noStay();
    if (!verified) return notVerified();
    if (stay.business.in_room_dining_enabled === false) return apiError('In-room dining is not offered at this venue.', 'ROOM_DINING_OFF', 403);
    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) return apiError('Add a dish first.', 'INVALID_PAYLOAD', 400);

    const identity: Record<string, any> = {};
    const [rate, window, billingGuardError] = await Promise.all([
      checkGuestOrderRateLimit(getClientIp(request), stay.business.id),
      loadDiningWindow(db, stay.business.id),
      assertVenueBillingAllowed(stay.business.id, db),
      applyRequestIdentity(db, request, stay.business.id, identity, { name: 'guest_name', phone: 'guest_phone' }),
      assertDishesOnly(db, stay.business.id, items),
    ]);
    if (!rate.allowed) return rateLimitResponse(rate, 'Too many orders. Please wait a moment.');
    if (!window.open) return apiError(diningMessage(window), 'KITCHEN_CLOSED', 409);
    if (billingGuardError) return billingGuardError;

    const key = generateIdempotencyKey('room_order', `${stay.business.id}:${stay.room.id}`, { items, note: body?.note, idempotency_key: body?.idempotency_key });
    const { response, status } = await withIdempotency(key, async () => {
      const result = await placeRoomOrder(db, {
        business: stay.business, room: stay.room, items, note: body?.note, dishesChecked: true,
        idempotencyKey: typeof body?.idempotency_key === 'string' ? body.idempotency_key : null,
        guestHandle: identity.guest_handle || null,
      });
      return { response: result, status: 200 };
    });
    return NextResponse.json(response, { status });
  } catch (error: any) {
    const msg: string = error?.message || '';
    if (error?.code === 'NOT_A_DISH') return apiError(msg, 'NOT_A_DISH', 400);
    if (error?.status === 409 || /table is closed|ORDER_NOT_FOUND/i.test(msg)) return apiError('The kitchen could not take this order. Please try again.', 'ORDER_REFUSED', 409);
    if (/Missing|No items|Invalid|not on this venue|no longer available/.test(msg)) return apiError(msg, 'INVALID_PAYLOAD', 400);
    if (error?.status === 503) return apiError(msg, 'MENU_UNAVAILABLE', 503);
    return handleApiError(error, request, 'GuestRoomOrderPOST');
  }
}, 'GuestRoomOrderPOST');

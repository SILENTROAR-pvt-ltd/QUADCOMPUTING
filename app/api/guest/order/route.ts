import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { getGuestActiveOrder, placeGuestOrder } from '@/lib/services/guest-order.service';
import { apiError } from '@/lib/utils/api-response';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withIdempotency, generateIdempotencyKey } from '@/lib/services/api-idempotency.util';
import {
  getClientIp,
  checkGuestOrderRateLimit,
  enforceRateLimit,
  rateLimitResponse,
} from '@/lib/middleware/rate-limiter';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { applyRequestIdentity } from '@/lib/services/guest-auth/request-identity';
import { newDeliveryTableNumber } from '@/lib/services/delivery/delivery-input';
import { isRoomTable } from '@/lib/guest/room-mode';
import { assertVenueBillingAllowed } from '@/lib/services/billing/venue-guard.service';
import { hasFeature } from '@/lib/services/billing/feature-gate';
import { afterResponse } from '@/lib/utils/after-response';

/**
 * GET /api/guest/order
 * Check if there is an active, unbilled order running for the given table.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cafeParamRaw = searchParams.get('cafe_id') || searchParams.get('business_id');
    const tableParamRaw = searchParams.get('table') || searchParams.get('table_number');

    const validation = await validateGuestAccess(cafeParamRaw, tableParamRaw);
    if (validation.error) return validation.error;
    // Venue-sized: every phone at the table reads this on every push. A ceiling against a runaway script, not a per-guest
    // quota, so it is counted on this instance only: a shared count added a network write to every guest read.
    const limited = await enforceRateLimit(request, 'guest_order_get', 1500, 60_000, validation.businessId, { localOnly: true });
    if (limited) return limited;

    const supabase = adminDb();
    const result = await getGuestActiveOrder(request.url, supabase);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message?.includes('Missing') || error.message?.includes('Invalid')) {
      return apiError(error.message, 'INVALID_PARAMS', 400);
    }
    return handleApiError(error, request, 'GuestOrderGET');
  }
}, 'GuestOrderGET');

/**
 * POST /api/guest/order
 * Smart Active Order Detection & Add-on Order Flow:
 * If an active unbilled order exists for the table, appends new items to that master order
 * and generates an add-on KOT ticket. Otherwise, creates a fresh master order.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  // Server time per step, in the standard Server-Timing header (durations only), so a load test can tell server time
  // from network time.
  const t0 = performance.now();
  try {
    const { searchParams } = new URL(request.url);
    const queryCafeId = searchParams.get('cafe_id') || searchParams.get('business_id');

    const body = await request.json().catch(() => ({}));
    const rawCafeId = queryCafeId || body?.business_id || body?.cafe_id;

    // A delivery has no table: it gets its own bill number, so it never joins a table's bill.
    const isDelivery = body?.order_type === 'delivery';
    const validation = await validateGuestAccess(rawCafeId, isDelivery ? undefined : body?.table_number);
    if (validation.error) return validation.error;
    const businessId = validation.businessId;
    const tableNumber = isDelivery ? newDeliveryTableNumber() : validation.tableNumber;

    // A room's label ("RS-101") is not a table: an order under it goes through the room's own endpoint, which ties it to
    // the stay and its bill. Taken here it would be a loose table order that no checkout ever settles.
    if (!isDelivery && isRoomTable(tableNumber)) {
      return apiError('Order to your room from your room page, so it goes on your room bill.', 'ROOM_ORDER_MISROUTED', 400);
    }

    const supabase = adminDb();
    // Delivery is part of M²-Pro and Rhodium: a venue on M¹-Pro takes table orders only.
    if (isDelivery && !(await hasFeature(businessId, 'delivery', supabase))) {
      return apiError('This venue is not taking delivery orders right now.', 'DELIVERY_UNAVAILABLE', 402);
    }
    body.business_id = businessId;
    body.cafe_id = businessId;
    body.table_number = tableNumber;

    // The three checks before the order need nothing from one another, so they run at once: the limit per address and
    // venue, the venue's standing (wallet and subscription), and who is ordering (identity only from the guest's own
    // sign-in session; a handle sent by the browser is dropped).
    const tChecks = performance.now();
    const [orderRateLimit, billingGuardError] = await Promise.all([
      checkGuestOrderRateLimit(getClientIp(request), businessId),
      assertVenueBillingAllowed(businessId, supabase),
      applyRequestIdentity(supabase, request, businessId, body, { name: 'guest_name', phone: 'guest_phone' }),
    ]);
    if (!orderRateLimit.allowed) {
      return rateLimitResponse(orderRateLimit, 'Too many order requests. Please wait a moment before submitting again.');
    }
    if (billingGuardError) return billingGuardError;

    const key = generateIdempotencyKey('guest_order', `${businessId}:${tableNumber}`, body);

    const tOrder = performance.now();
    let placeMs = 0;
    const steps: { wait?: number; reads?: number; rpc?: number; attempts?: number } = {};
    // The guard shares the answer with other instances just after the guest has it (a retry in between waits for it).
    const { response, status } = await withIdempotency(key, async () => {
      const tPlace = performance.now();
      const result = await placeGuestOrder(body, supabase, steps);
      placeMs = performance.now() - tPlace;
      return { response: result, status: 200 };
    }, { defer: (work) => afterResponse('guest-order-guard', work) });
    const tEnd = performance.now();
    const timing = [
      `venue;dur=${(tChecks - t0).toFixed(1)}`,
      `checks;dur=${(tOrder - tChecks).toFixed(1)}`,
      `guard;dur=${Math.max(0, tEnd - tOrder - placeMs).toFixed(1)}`,
      `place;dur=${placeMs.toFixed(1)}`,
      // Inside "place": queued behind the same table's orders, the parallel reads, and the order function (with its retries).
      `wait;dur=${(steps.wait ?? 0).toFixed(1)}`,
      `reads;dur=${(steps.reads ?? 0).toFixed(1)}`,
      `rpc;dur=${(steps.rpc ?? 0).toFixed(1)}`,
      `attempts;dur=${steps.attempts ?? 1}`,
      `total;dur=${(tEnd - t0).toFixed(1)}`,
    ].join(', ');

    return NextResponse.json(response, { status, headers: { 'Server-Timing': timing } });
  } catch (error: any) {
    const msg: string = error.message || '';
    const isClientError =
      msg.includes('Missing') ||
      msg.includes('No items') ||
      msg.includes('Invalid');
    const isNotFound = msg.includes('not found');
    const isTableClosed =
      msg.toLowerCase().includes('table is closed') ||
      msg.includes('ORDER_NOT_FOUND') ||
      error.status === 409;

    // A delivery the venue's terms refuse (out of range, below the minimum, delivery off) is told to the guest as it is.
    if (typeof error.code === 'string' && error.code.startsWith('DELIVERY_')) {
      return apiError(msg, error.code, 422);
    }

    if (isTableClosed) {
      return apiError(
        'This table has been closed or settled. Please ask staff to re-open the table.',
        'TABLE_CLOSED',
        409
      );
    }
    if (isNotFound) {
      return apiError(msg, 'NOT_FOUND', 404);
    }
    if (isClientError) {
      return apiError(msg, 'INVALID_PAYLOAD', 400);
    }

    return handleApiError(error, request, 'GuestOrderPOST');
  }
}, 'GuestOrderPOST');

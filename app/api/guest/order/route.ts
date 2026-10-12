import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { getGuestActiveOrder, placeGuestOrder } from '@/lib/services/guest-order.service';
import { apiError } from '@/lib/utils/api-response';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withIdempotency, generateIdempotencyKey } from '@/lib/services/api-idempotency.util';
import {
  getClientIp,
  checkGuestOrderRateLimit,
  rateLimitResponse,
} from '@/lib/middleware/rate-limiter';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { applyRequestIdentity } from '@/lib/services/guest-auth/request-identity';

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
  try {
    const { searchParams } = new URL(request.url);
    const queryCafeId = searchParams.get('cafe_id') || searchParams.get('business_id');

    const body = await request.json().catch(() => ({}));
    const rawCafeId = queryCafeId || body?.business_id || body?.cafe_id;

    const validation = await validateGuestAccess(rawCafeId, body?.table_number);
    if (validation.error) return validation.error;
    const { businessId, tableNumber } = validation;

    // Rate Limiting: Apply sliding window rate limit per IP & venue
    const ip = getClientIp(request);
    const orderRateLimit = await checkGuestOrderRateLimit(ip, businessId);
    if (!orderRateLimit.allowed) {
      return rateLimitResponse(
        orderRateLimit,
        'Too many order requests. Please wait a moment before submitting again.'
      );
    }

    const supabase = adminDb();

    // Venue Credit & Subscription Guard: Zero orders if venue balance < 0 or inactive
    const { assertVenueBillingAllowed } = await import('@/lib/services/billing/venue-guard.service');
    const billingGuardError = await assertVenueBillingAllowed(businessId, supabase);
    if (billingGuardError) return billingGuardError;

    body.business_id = businessId;
    body.cafe_id = businessId;
    body.table_number = tableNumber;

    // Identity only from the guest's own sign-in session; a handle sent by the browser is dropped.
    await applyRequestIdentity(supabase, request, businessId, body, { name: 'guest_name', phone: 'guest_phone' });

    const key = generateIdempotencyKey('guest_order', `${businessId}:${tableNumber}`, body);

    const { response, status } = await withIdempotency(key, async () => {
      const result = await placeGuestOrder(body, supabase);
      return { response: result, status: 200 };
    });

    return NextResponse.json(response, { status });
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

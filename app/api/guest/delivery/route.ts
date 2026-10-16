import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess, UUID_REGEX } from '@/lib/auth/guest-validate';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { getGuestDeliveryStatus } from '@/lib/services/delivery/delivery-orders.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guest/delivery?business_id=…&order_id=… : how far a delivery has got, for the guest who placed it.
 * The order id is an unguessable UUID that only the placing device holds. The reply has no address and no phone.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id') || '';
    if (!UUID_REGEX.test(orderId)) return NextResponse.json({ error: 'Invalid order.' }, { status: 400 });

    const validation = await validateGuestAccess(searchParams.get('cafe_id') || searchParams.get('business_id'));
    if (validation.error) return validation.error;
    const limited = await enforceRateLimit(request, 'guest_delivery_status', 1200, 60_000, validation.businessId);
    if (limited) return limited;

    const status = await getGuestDeliveryStatus(adminDb(), validation.businessId, orderId);
    if (!status) return NextResponse.json({ error: 'Delivery order not found.' }, { status: 404 });
    return NextResponse.json({ success: true, ...status }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    return handleApiError(error, request, 'GuestDeliveryGET');
  }
}, 'GuestDeliveryGET');

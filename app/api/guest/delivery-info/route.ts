import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { loadPublicDeliveryTerms } from '@/lib/services/delivery/delivery-settings.service';

export const dynamic = 'force-dynamic';

/** GET /api/guest/delivery-info?cafe_id=… : the venue's delivery radius, minimum order and fee for the guest's cart. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const validation = await validateGuestAccess(searchParams.get('cafe_id') || searchParams.get('business_id'));
    if (validation.error) return validation.error;
    const limited = await enforceRateLimit(request, 'guest_delivery_info', 600, 60_000, validation.businessId);
    if (limited) return limited;

    const terms = await loadPublicDeliveryTerms(adminDb(), validation.businessId);
    return NextResponse.json({ success: true, ...terms }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    return handleApiError(error, request, 'GuestDeliveryInfoGET');
  }
}, 'GuestDeliveryInfoGET');

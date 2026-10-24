import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { loadPublicDeliveryTerms } from '@/lib/services/delivery/delivery-settings.service';
import { hasFeature } from '@/lib/services/billing/feature-gate';

export const dynamic = 'force-dynamic';

/** GET /api/guest/delivery-info?cafe_id=… : the venue's delivery radius, minimum order and fee for the guest's cart. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const validation = await validateGuestAccess(searchParams.get('cafe_id') || searchParams.get('business_id'));
    if (validation.error) return validation.error;
    const limited = await enforceRateLimit(request, 'guest_delivery_info', 600, 60_000, validation.businessId);
    if (limited) return limited;

    const db = adminDb();
    const [terms, onPlan] = await Promise.all([loadPublicDeliveryTerms(db, validation.businessId), hasFeature(validation.businessId, 'delivery', db)]);
    // Delivery is part of M²-Pro and Rhodium: on M¹-Pro the guest sees no delivery option.
    return NextResponse.json({ success: true, ...terms, enabled: terms.enabled && onPlan }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    return handleApiError(error, request, 'GuestDeliveryInfoGET');
  }
}, 'GuestDeliveryInfoGET');

import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { invalidateVenueMenu } from '@/lib/services/guest-menu/venue-menu-cache';
import { DishAvailabilityError, setDishAvailability } from '@/lib/services/catalog/dish-availability.service';
import { safeMessage } from '@/lib/utils/safe-message';

/**
 * POST /api/host/catalog/availability?business_id= { id, available } — puts a dish on the guest menu or takes it off.
 * The owner's call: staff sign-ins only read the catalogue. The guest menu cache is cleared, so the next menu read has it.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => ({}));
  try {
    const result = await setDishAvailability(auth.supabase, auth.businessId, String(body?.id || ''), body?.available);
    invalidateVenueMenu(auth.businessId);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    if (err instanceof DishAvailabilityError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('[API Catalog availability]', err);
    return NextResponse.json({ success: false, error: safeMessage(err, 'Could not change the dish') }, { status: 500 });
  }
}, 'HostCatalogAvailabilityPOST');

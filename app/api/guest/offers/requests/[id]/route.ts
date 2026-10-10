import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess, UUID_REGEX } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { getOfferRequest } from '@/lib/services/offers/offer-requests';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

/** GET /api/guest/offers/requests/:id?cafe_id= — where a redemption or question stands now. */
export const GET = withApiErrorBoundary(async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const venue = await validateGuestAccess(url.searchParams.get('cafe_id') || url.searchParams.get('business_id'));
  if (venue.error) return venue.error;
  if (!UUID_REGEX.test(id)) return NextResponse.json({ success: false, error: 'Request not found.' }, { status: 404, headers: NO_STORE });

  const result = await getOfferRequest(adminDb(), venue.businessId, id);
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status, headers: NO_STORE });
  return NextResponse.json({ success: true, request: result.value }, { headers: NO_STORE });
}, 'GuestOfferRequestGET');

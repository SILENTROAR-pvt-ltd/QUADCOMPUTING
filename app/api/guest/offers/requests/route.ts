import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { accountForRequest } from '@/lib/services/guest-auth/guest-account.service';
import { cleanOfferRequest } from '@/lib/services/offers/offer-request-input';
import { createOfferRequest } from '@/lib/services/offers/offer-requests';
import { hasFeature } from '@/lib/services/billing/feature-gate';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const fail = (error: string, status: number) => NextResponse.json({ success: false, error }, { status, headers: NO_STORE });

/** POST /api/guest/offers/requests?cafe_id=&table= — redeem a live offer, or ask the host about it. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const url = new URL(request.url);
  const venue = await validateGuestAccess(url.searchParams.get('cafe_id') || url.searchParams.get('business_id'), url.searchParams.get('table'));
  if (venue.error) return venue.error;

  const limited = await enforceRateLimit(request, 'guest_offer_request', 20, 10 * 60_000, venue.businessId);
  if (limited) return limited;

  const body = await request.json().catch(() => ({}));
  const checked = cleanOfferRequest(body);
  if (!checked.ok) return fail(checked.error, 400);

  const db = adminDb();
  // Offers are part of M²-Pro and Rhodium.
  if (!(await hasFeature(venue.businessId, 'offers', db))) return fail('This offer is no longer available.', 402);
  const account = await accountForRequest(db, request, venue.businessId);
  const input = {
    ...checked.value,
    table: checked.value.table || venue.tableNumber || null,
    guestName: checked.value.guestName || account?.display_name || null,
  };

  const result = await createOfferRequest(db, venue.businessId, input, account?.id ?? null);
  if (!result.ok) return fail(result.error, result.status);
  return NextResponse.json({ success: true, request: result.value }, { status: 201, headers: NO_STORE });
}, 'GuestOfferRequestPOST');

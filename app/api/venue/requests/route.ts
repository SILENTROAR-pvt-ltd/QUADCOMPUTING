import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { listOpenOfferRequests, settleOfferRequest } from '@/lib/services/offers/offer-requests-host';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/venue/requests — open offer redemptions and questions for the host's venue. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const requests = await listOpenOfferRequests(adminDb(), auth.businessId);
    return NextResponse.json({ success: true, requests }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    return handleApiError(error, request, 'VenueRequestsGET');
  }
}, 'VenueRequestsGET');

/** PATCH /api/venue/requests  { id, status: 'settled' | 'closed' } — settle a redemption or close a request. */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const status = body?.status === 'settled' || body?.status === 'closed' ? body.status : null;
    if (!status || typeof body?.id !== 'string' || !UUID_REGEX.test(body.id)) {
      return NextResponse.json({ success: false, error: 'Provide a request id and a status of settled or closed.' }, { status: 400 });
    }

    const result = await settleOfferRequest(adminDb(), auth.businessId, body.id, status);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, id: result.value.id, status });
  } catch (error: any) {
    return handleApiError(error, request, 'VenueRequestsPATCH');
  }
}, 'VenueRequestsPATCH');

import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { listServiceRequests } from '@/lib/services/reservations/service-requests.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/host/reservations/services
 * Guests' requests for the venue's services from the menu, waiting ones first. Marking one done is the bell's own
 * PATCH /api/host/notifications { id }, so the tray and this list never disagree.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const requests = await listServiceRequests(adminDb(), auth.businessId);
    return NextResponse.json({ success: true, requests }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    return handleApiError(error, request, 'HostServiceRequestsGET');
  }
}, 'HostServiceRequestsGET');

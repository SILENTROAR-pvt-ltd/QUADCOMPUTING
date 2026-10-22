import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { reservationSummary } from '@/lib/services/reservations/reservation-summary.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/host/reservations/summary?since=<ISO time>
 * For the sidebar's Reservations light: per kind (tables, rooms, events, offers) how many wait to be handled, and how
 * many arrived after `since` (when the host last opened the tab). Owner only; counts, no guest details.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const raw = new URL(request.url).searchParams.get('since');
    const t = raw ? Date.parse(raw) : NaN;
    const since = Number.isFinite(t) ? new Date(t).toISOString() : null;
    const summary = await reservationSummary(adminDb(), auth.businessId, since);
    return NextResponse.json({ success: true, summary }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'HostReservationsSummaryGET');
  }
}, 'HostReservationsSummaryGET');

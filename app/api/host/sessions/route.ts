import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import {
  getActiveHostSessions,
  getBillRequestHistory,
  fetchActiveSessionLines,
  settleAndVacateSession,
} from '@/lib/services/session.service';
import { releaseTable } from '@/lib/services/session/release-table.service';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';

/**
 * GET /api/host/sessions
 * Fetch all active dine-in sessions for the host's tables.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { supabase } = auth;

    const view = new URL(request.url).searchParams.get('view');
    const result = view === 'bill_requests'
      ? await getBillRequestHistory(supabase, auth.businessId)
      : await getActiveHostSessions(supabase, auth.businessId);
    return NextResponse.json({ ...result, data: result });
  } catch (error: any) {
    return handleApiError(error, request, 'HostSessionsGET');
  }
}, 'HostSessionsGET');

/**
 * POST /api/host/sessions
 * Fetch full itemized lines for a table's active session to load into POS cart.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;

    const body = await request.json();
    if (body.business_id && body.business_id !== businessId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Business ID mismatch', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const { withIdempotency, generateIdempotencyKey } = await import('@/lib/services/api-idempotency.util');
    const key = generateIdempotencyKey('session_lines', `${businessId}:${body.table_number || ''}`, body);

    const { response, status } = await withIdempotency(key, async () => {
      const result = await fetchActiveSessionLines({ ...body, business_id: businessId }, supabase);
      return { response: { ...result, data: result }, status: 200 };
    });

    return NextResponse.json(
      response,
      { status }
    );
  } catch (error: any) {
    return handleApiError(error, request, 'HostSessionsPOST');
  }
}, 'HostSessionsPOST');

/**
 * PATCH /api/host/sessions
 * Close session, settle master bill, and trigger Pay-As-You-Go fee guard.
 */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;

    const body = await request.json();
    if (body.business_id && body.business_id !== businessId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Business ID mismatch', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    const venueId = businessId;
    body.business_id = venueId;

    // Free a table whose bill was never started, without taking payment.
    if (body.action === 'release') {
      const released = await releaseTable(body, supabase, venueId);
      return NextResponse.json(released, { status: released.ok ? 200 : released.status });
    }

    // A waiter sends the table's bill to billing: the same bill request a guest makes, so the billing POS lists the table
    // and rings. Nothing is settled and the table is not freed; the cashier does that from billing.
    if (body.action === 'request_bill') {
      const { updateGuestSession } = await import('@/lib/services/guest-session/update-session.service');
      const result = await updateGuestSession({ ...body, business_id: venueId, cafe_id: venueId, action: 'request_bill' }, supabase);
      return NextResponse.json(result);
    }

    const { withIdempotency, generateIdempotencyKey } = await import('@/lib/services/api-idempotency.util');
    const key = generateIdempotencyKey(
      'settle_session',
      `${venueId}:${body.table_number || body.table_id || body.session_id || ''}`,
      body
    );

    const { response, status } = await withIdempotency(key, async () => {
      // Platform fee is deducted exactly once, inside settleAndVacateSession
      // (previously this route ALSO called evaluateFeeGuard before it, with a
      // different invoice ref, double-charging the venue's wallet per settlement).
      const result = await settleAndVacateSession(body, supabase);
      const feeResult = result.platform_fee;
      const invoiceRef = feeResult?.invoiceRef ?? null;
      return { response: { ...result, feeResult, invoiceRef, data: { ...result, feeResult, invoiceRef } }, status: 200 };
    });

    return NextResponse.json(response, { status });
  } catch (error: any) {
    return handleApiError(error, request, 'HostSessionsPATCH');
  }
}, 'HostSessionsPATCH');

import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { attachPaidBefore, cancelPayment, isTableMissing, listLivePayments, verifyPayment } from '@/lib/services/payments/bill-payment.service';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/host/payments
 * The venue's live payments: what each table chose to pay with, what is waiting for staff to confirm, and what is confirmed
 * and waiting for billing to settle. Shared by the waiter's tables and the billing POS.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const db = adminDb();
    const { payments, missing } = await listLivePayments(db, auth.businessId);
    // What was already paid and confirmed earlier on each bill, so staff collect only the part that is left.
    const withPaid = await attachPaidBefore(db, auth.businessId, payments);
    return NextResponse.json({ success: true, ready: !missing, payments: withPaid }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    return handleApiError(error, request, 'HostPaymentsGET');
  }
}, 'HostPaymentsGET');

/**
 * PATCH /api/host/payments  { id, action: 'verify' | 'cancel' }
 * Staff confirm that the money was received (the waiter has seen the guest's screen, or has the cash or card payment), or
 * cancel a payment the guest changed their mind about. Confirming does not settle the bill: billing does that.
 */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    const id = typeof body?.id === 'string' && UUID.test(body.id) ? body.id : '';
    if (!id) return NextResponse.json({ success: false, error: 'Missing payment.' }, { status: 400 });
    const db = adminDb();

    if (body?.action === 'cancel') {
      const cancelled = await cancelPayment(db, auth.businessId, id);
      if (!cancelled) return NextResponse.json({ success: false, error: 'That payment can no longer be cancelled.' }, { status: 409 });
      return NextResponse.json({ success: true, payment: cancelled });
    }

    if (body?.action !== 'verify') return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 });
    const by = String((auth as any).user?.email || (auth as any).user?.id || 'staff').slice(0, 120);
    const verified = await verifyPayment(db, auth.businessId, id, by);
    if (!verified) return NextResponse.json({ success: false, error: 'That payment was already handled.' }, { status: 409 });
    return NextResponse.json({ success: true, payment: verified });
  } catch (error: any) {
    if (isTableMissing(error)) return NextResponse.json({ success: false, error: 'Payments are not set up yet.' }, { status: 503 });
    return handleApiError(error, request, 'HostPaymentsPATCH');
  }
}, 'HostPaymentsPATCH');

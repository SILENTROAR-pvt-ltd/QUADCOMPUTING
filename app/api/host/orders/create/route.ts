import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { createHostOrder } from '@/lib/services/orders.service';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;

    const body = await request.json().catch(() => ({}));
    if (body.business_id && body.business_id !== businessId) {
      return NextResponse.json(
        { error: 'Forbidden: Business ID mismatch' },
        { status: 403 }
      );
    }

    const order = await createHostOrder(supabase, businessId, body);

    // Counter/takeaway bills have no table session or room checkout to carry the platform fee, and
    // the browser used to trigger it in a separate fire-and-forget call a host could simply skip.
    // Charged here, keyed to the order id, so a retry is idempotent. Table bills pay via session
    // settlement and room stays via checkout.
    const isCounterBill = order && !order.table_id && !order.room_id;
    if (isCounterBill && String(order.status || '').toUpperCase() === 'SETTLED') {
      try {
        const { invoiceRefFromId, evaluateFeeGuard } = await import('@/lib/services/wallet/fee-guard.service');
        await evaluateFeeGuard(businessId, 'bill_generate', invoiceRefFromId(order.id), supabase);
      } catch (feeErr) {
        console.error('[API Orders POST] counter-bill fee failed', { orderId: order?.id, feeErr });
      }
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error('[API Orders POST]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}, 'HostOrdersCreatePOST');

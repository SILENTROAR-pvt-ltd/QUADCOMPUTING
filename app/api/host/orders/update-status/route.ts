import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { deductOrderInventory } from '@/lib/services/inventory/movement.service';

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId } = auth;
    const supabase = adminDb();

    const { orderId, status } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 });
    }
    if (typeof status !== 'string' || !/^[A-Za-z_]{2,32}$/.test(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // 1. Fetch the Order to check its items and current status
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, items, status')
      .eq('id', orderId)
      .eq('business_id', businessId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const DEPLETED = ['COMPLETED', 'SERVED'];
    const isNowDepleting = DEPLETED.includes(status.toUpperCase());

    // 2. Update Order Status. When this transition depletes stock, the UPDATE itself is the
    // claim: it only matches a row that is not already COMPLETED/SERVED, so of two concurrent
    // requests exactly one gets a row back and runs depletion + fee. A read-then-write check
    // let both pass and deduct twice.
    let updateQuery = supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .eq('business_id', businessId);
    if (isNowDepleting) {
      updateQuery = updateQuery.not('status', 'in', '("COMPLETED","SERVED","completed","served")');
    }
    const { data: movedRows, error: updateError } = await updateQuery.select('id');

    if (updateError) {
      throw updateError;
    }

    const claimedDepletion = isNowDepleting && (movedRows?.length ?? 0) > 0;

    // Already COMPLETED/SERVED: the claim above matched nothing (stock and fee were handled by whoever
    // got there first), but the new status (e.g. COMPLETED -> SERVED) must still be recorded.
    if (isNowDepleting && !claimedDepletion) {
      const { error: followUpError } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .eq('business_id', businessId);
      if (followUpError) throw followUpError;
    }
    let depletionErrors = 0;

    // 3. Recipe stock: the shared, once-per-order deduction (also used by the till and the kitchen).
    if (claimedDepletion) {
      const result = await deductOrderInventory(supabase, orderId);
      if (!result.ok) {
        depletionErrors = 1;
        console.error('[UpdateStatus] recipe stock was not deducted', { orderId, businessId, error: result.error });
      }
    }

    // 4. 💳 Fee Guard — fire when an order is finalized (COMPLETED or SETTLED)
    //    ₹3 deducted from wallet OR logged to venue_outstanding_bills
    if (claimedDepletion) {
      try {
        const { evaluateFeeGuard } = await import('@/lib/services/wallet/fee-guard.service');
        const { feeReferenceFor } = await import('@/lib/services/wallet/invoice-history.util');
        // The same reference the settlement uses (SETTLE_<order id>): this bill had been charged twice, once here
        // under a QC- reference and once at settlement. One reference means one ₹3 fee per bill.
        await evaluateFeeGuard(businessId, 'bill_generate', feeReferenceFor(orderId), supabase);
      } catch (feeErr) {
        console.error('[UpdateStatus FeeGuard Error]', feeErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: depletionErrors > 0
        ? 'Order updated, but recipe stock could not be deducted. Please review inventory.'
        : 'Order status updated and inventory depleted if applicable',
      depletion_errors: depletionErrors,
    });
  } catch (error: any) {
    console.error('[UPDATE ORDER STATUS API]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, 'HostOrdersUpdateStatusPOST');

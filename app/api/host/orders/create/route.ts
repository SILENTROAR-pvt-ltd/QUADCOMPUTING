import { safeMessage } from '@/lib/utils/safe-message';
import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { createHostOrder } from '@/lib/services/orders.service';
import { settleAndVacateSession } from '@/lib/services/session.service';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { withIdempotency } from '@/lib/services/api-idempotency.util';
import { afterResponse } from '@/lib/utils/after-response';
import { isFeeBearingStatus } from '@/lib/services/orders/bill-status.util';
import { adjustRoomFromTill, roomSettleMode, settleRoomFromTill } from '@/lib/services/billing/room-till-settlement';
import { readCashTender } from '@/lib/services/billing/cash-tender';

const TENDERS = ['UPI', 'CASH', 'CARD'];

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

    // Cash handed over must cover what this bill takes: the whole bill, or the part adjusted in a room's stay.
    const partOfStay = body.roomId && body.settlement && roomSettleMode(body.settlement) === 'payment' ? Number(body.settlement.amount) : NaN;
    const due = Number.isFinite(partOfStay) && partOfStay > 0 ? partOfStay : Number(body.grandTotal) || 0;
    const cash = readCashTender(body.paymentMethod, due, body.cashTendered);
    if (cash.error) return NextResponse.json({ success: false, error: cash.error }, { status: 400 });

    // A room's bill from the till (room-till-settlement.ts): adjusted in the running stay, or, only when the receipt
    // says so, the guest's checkout. Never a table settlement, and never a checkout by accident.
    if (body.roomId && body.settlement) {
      const roomId = String(body.roomId);
      if (roomSettleMode(body.settlement) === 'checkout') return settleRoomFromTill(request, businessId, roomId, body.paymentMethod, cash.tender);
      const adjusted = await adjustRoomFromTill(businessId, roomId, body);
      // No guest in the room: it was released earlier with its invoice waiting (the old two-step checkout). Settle that.
      if (adjusted.status === 409) return settleRoomFromTill(request, businessId, roomId, body.paymentMethod, cash.tender);
      return adjusted;
    }

    const order = await createHostOrder(supabase, businessId, body);

    // A table or room bill is saved and settled in this one request: the till used to make two calls, each signing the
    // host in again, and wait for both. The settlement is the same one the table route runs (one transaction for the
    // order, session, table, redemption and cashback); if it is refused the order stays open and the host sees why.
    if (body.settlement && order?.id) {
      const s = body.settlement;
      const tender = String(body.paymentMethod || '').toUpperCase();
      try {
        const { response } = await withIdempotency(`settle_order:${businessId}:${order.id}`, async () => {
          const result = await settleAndVacateSession({
            business_id: businessId,
            order_id: order.id,
            session_id: s.session_id || undefined,
            table_id: order.table_id || body.tableId || undefined,
            table_number: order.table_number || body.tableNumber,
            final_items: body.items,
            subtotal: body.subtotal,
            tax_amount: body.taxAmount,
            grand_total: body.grandTotal,
            discount_amount: body.discountAmount,
            discount_type: body.discountType,
            discount_value: body.discountValue,
            redemption_code: s.redemption_code || undefined,
            credit_cashback: s.credit_cashback !== false,
            payment_method: TENDERS.includes(tender) ? tender : undefined,
          }, adminDb());
          return { response: result, status: 200 };
        });
        return NextResponse.json({ success: true, order, settled: true, settlement: response, change: cash.tender?.cash_change ?? null });
      } catch (settleError) {
        // A database error object is not an Error: give it a real message and its own status so the till reads why.
        const e: any = settleError;
        const err = e instanceof Error ? e : Object.assign(new Error(String(e?.message || e?.error || 'The settlement was refused.')), { status: e?.status, code: e?.code, details: e?.details });
        return handleApiError(err, request, 'HostOrdersCreateSettle');
      }
    }

    // A bill saved without a settlement has no table session or room checkout to carry the platform fee, and
    // Charged here, keyed to the order id, so a retry is idempotent. Table bills pay via session
    // settlement and room stays via checkout. It runs after the response: the fee never blocks the till.
    // Any bill saved closed here, counter, table or room, reaches this point only when no settlement ran, so no other path
    // charged it. A closed status is therefore enough: the client chooses the table, room and status, so none of them can skip the fee.
    const isClosed = Boolean(order) && isFeeBearingStatus(order.status);
    if (isClosed) {
      afterResponse('counter-bill-fee', async () => {
        const { evaluateFeeGuard } = await import('@/lib/services/wallet/fee-guard.service');
        const { feeReferenceFor } = await import('@/lib/services/wallet/invoice-history.util');
        // The same reference the settlement uses, so a bill is charged its ₹3 once whichever path settles it.
        await evaluateFeeGuard(businessId, 'bill_generate', feeReferenceFor(order.id), supabase);
      });
    }

    return NextResponse.json({ success: true, order, change: cash.tender?.cash_change ?? null });
  } catch (error: any) {
    console.error('[API Orders POST]', error);
    return NextResponse.json(
      { error: safeMessage(error, 'Internal Server Error') },
      { status: 500 }
    );
  }
}, 'HostOrdersCreatePOST');

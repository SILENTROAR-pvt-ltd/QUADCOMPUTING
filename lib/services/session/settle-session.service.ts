import { assertRedemptionSettleable } from '@/lib/services/wallet/redemption.service';
import { loadGstStatus } from '@/lib/services/billing/gst-policy';
import { readSettlementInput } from './settle-input';
import { resolveBusinessId, resolveOpenOrder, resolveSettlementContext } from './settle-context';
import { decideCashback } from './settle-owner';
import { applyGstPolicy, billingFields, executeAtomicSettlement } from './settle-atomic';
import { runAfterSettlement } from './settle-after';

/**
 * Settles a table or room bill and vacates the table. The stages run in this order, and the order is part of the contract:
 * read the request; find the venue; start the venue's standing and GST reads; find the table, session and order, each only
 * within the caller's venue; refuse when the venue may not bill; decide the order, cashback and wallet redemption; one
 * database transaction for the money; then everything that follows it.
 */
export async function settleAndVacateSession(body: any, supabase: any) {
  const nowIso = new Date().toISOString();
  const input = readSettlementInput(body);
  const businessId = await resolveBusinessId(input, supabase);
  if (!businessId) throw new Error('Business ID is required to settle session');

  // The venue's standing and GST status do not depend on the table or the order, so they are read alongside the lookups.
  // Both are checked before anything is written.
  const guardPromise = import('@/lib/services/billing/venue-guard.service').then((m) => m.checkVenueBillingGuard(businessId, supabase));
  const gstPromise = loadGstStatus(supabase, businessId);
  guardPromise.catch(() => {});
  gstPromise.catch(() => {});

  const ctx = await resolveSettlementContext(input, businessId, supabase);

  // ── Venue Credit & Subscription Guard ── RULE (a): zero guest checkout if the venue's wallet is below 0 or its
  // subscription is inactive.
  const guard = await guardPromise;
  if (!guard.allowed) {
    const err: any = new Error(guard.reason || 'Venue suspended');
    err.status = guard.status || 402;
    err.code = guard.code || 'venue_suspended';
    err.details = guard.details;
    throw err;
  }

  const order = await resolveOpenOrder(ctx, businessId, supabase);
  const orderId: string | null = order?.id || input.orderId;
  let settledTotal = Number(body?.grand_total || body?.subtotal || order?.grand_total || order?.total_amount || order?.subtotal || 0);
  const cashback = await decideCashback(orderId, body, supabase);
  // Precedence for a bill with no signed-in guest mirrors how such a guest reads their wallet (phone, then name).
  const guestName = ctx.sessionGuestName || order?.customer_name || body?.customer_name || body?.guest_name || null;
  const guestPhone = order?.customer_phone || body?.customer_phone || null;

  // A wallet redemption must be able to fund this bill before anything is written: a rejected code leaves the order open.
  const redemptionCode: string | null = body?.redemption_code || body?.redemptionCode || null;
  if (redemptionCode) {
    await assertRedemptionSettleable(supabase, {
      code: String(redemptionCode),
      businessId,
      orderId,
      discountAmount: Number(body?.discount_amount) || 0,
      subtotal: Number(body?.subtotal) || Number(order?.subtotal) || undefined,
    });
  }

  const gst = await gstPromise;
  const priced = applyGstPolicy(gst, billingFields(body), settledTotal);
  settledTotal = priced.settledTotal;

  // The cashback base is the bill the server priced when the order was placed. The till's subtotal may only lower
  // it (a voided dish), never raise it; the settlement function applies the same rule against the order's lines.
  const storedSubtotal = Number(order?.subtotal) || 0;
  const tillSubtotal = Number(body?.subtotal) || 0;
  const subtotal = storedSubtotal > 0 ? (tillSubtotal > 0 ? Math.min(storedSubtotal, tillSubtotal) : storedSubtotal) : (tillSubtotal || settledTotal);

  const settled = await executeAtomicSettlement(supabase, {
    sessionId: ctx.sessionId,
    orderId,
    rawTable: ctx.rawTable,
    businessId,
    grandTotal: settledTotal,
    subtotal: Number(subtotal) || 0,
    discountAmount: Number(body?.discount_amount) || 0,
    discountType: body?.discount_type || 'percentage',
    redemptionCode,
    guestId: cashback.primaryGuestId,
    guestHandle: cashback.creditCashback ? cashback.guestHandle : null,
    billing: orderId ? priced.billing : null,
  });

  const after = await runAfterSettlement({
    supabase,
    businessId,
    orderId,
    orderSessionId: order?.session_id ?? null,
    sessionId: ctx.sessionId,
    rawTable: ctx.rawTable,
    tableOr: ctx.tableOr,
    guestHandle: cashback.guestHandle,
    guestPhone,
    guestName,
    settledTotal,
    nowIso,
  });

  return {
    success: true,
    message: 'Table marked vacant, session closed, and order settled',
    status: 'VACANT',
    cashback: { cashback_amount: Number(settled.cashback_credited || 0) },
    redemption: redemptionCode ? { redeemed_amount: Number(settled.redeemed_amount || 0) } : null,
    inventory: after.inventory,
    platform_fee: after.platformFee,
  };
}

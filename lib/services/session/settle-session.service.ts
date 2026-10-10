import { normalizeTable, buildTableOrFilter } from './session-entry.util';
import { broadcastToGuestTable } from '@/lib/realtime/channels';
import { assertRedemptionSettleable } from '@/lib/services/wallet/redemption.service';
// Columns that exist on the deployed dine_in_sessions. It has no guest_name:
// selecting it made every session lookup here fail, so the guest's handle was
// never found and cashback was credited under their phone/name instead of the
// @handle their wallet reads.
const SESSION_GUEST_COLUMNS = 'id, business_id, table_id, table_number, guest_handle, guest_session_id';
const IS_UUID = (v: any) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
// Must match orders_payment_method_check in the database.
const TENDERS = ['UPI', 'CASH', 'CARD', 'SPLIT', 'WALLET'];

export async function settleAndVacateSession(body: any, supabase: any) {
  const { session_id, order_id, table_id, table_number, business_id } = body;
  const nowIso = new Date().toISOString();
  let rawTable = (table_number || '').trim(), normTable = normalizeTable(rawTable);
  let businessId = IS_UUID(business_id) ? business_id : '';
  let resolvedTableId = IS_UUID(table_id) ? table_id : null, targetSessionId = IS_UUID(session_id) ? session_id : null;
  if (table_id && !rawTable && !resolvedTableId) { rawTable = String(table_id).trim(); normTable = normalizeTable(rawTable); }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: b } = await supabase.from('businesses').select('id').eq('host_id', user.id).maybeSingle();
      if (b?.id) businessId = b.id;
    }
  } catch {}

  if (!businessId) {
    throw new Error('Business ID is required to settle session');
  }

  let resolvedOrder: any = null;
  if (order_id && IS_UUID(order_id)) {
    try {
      const { data: ord } = await supabase
        .from('orders')
        .select('id, business_id, session_id, table_id, table_number, customer_name, customer_phone, grand_total, subtotal')
        .eq('id', order_id)
        .eq('business_id', businessId)
        .maybeSingle();
      if (ord) {
        resolvedOrder = ord;
        if (!targetSessionId && ord.session_id) targetSessionId = ord.session_id;
        if (!resolvedTableId && ord.table_id) resolvedTableId = ord.table_id;
        if (!rawTable && ord.table_number) { rawTable = ord.table_number; normTable = normalizeTable(rawTable); }
      }
    } catch {}
  }

  const tableOr = rawTable ? buildTableOrFilter(rawTable) : '';
  if (resolvedTableId) {
    const { data: t } = await supabase
      .from('restaurant_tables')
      .select('id, business_id, table_number')
      .eq('id', resolvedTableId)
      .eq('business_id', businessId)
      .maybeSingle();
    if (t) { if (!rawTable) { rawTable = t.table_number || rawTable; normTable = normalizeTable(rawTable); } }
  } else if (rawTable && tableOr) {
    const { data: t } = await supabase
      .from('restaurant_tables')
      .select('id, business_id')
      .eq('business_id', businessId)
      .or(tableOr)
      .limit(1)
      .maybeSingle();
    if (t?.id && IS_UUID(t.id)) resolvedTableId = t.id;
  }

  // The guest's own identity lives on the dine-in session (written there by the
  // guest order pipeline). It MUST be carried into settlement: the guest reads
  // their wallet keyed by their handle (localStorage.guest_handle ->
  // useGuestWallet), so crediting cashback under anything else (e.g. the session
  // UUID) silently lands the money on a key the guest never reads, and their
  // wallet shows zero despite the bill confirming cashback.
  let sessionGuestHandle: string | null = null;
  let sessionGuestName: string | null = null;
  let sessionGuestSessionId: string | null = null;

  const captureSessionGuest = (s: any) => {
    if (!s) return;
    sessionGuestHandle = sessionGuestHandle || s.guest_handle || null;
    sessionGuestName = sessionGuestName || s.guest_name || null;
    sessionGuestSessionId = sessionGuestSessionId || s.guest_session_id || null;
  };

  if (targetSessionId) {
    const { data: s } = await supabase.from('dine_in_sessions').select(SESSION_GUEST_COLUMNS).eq('id', targetSessionId).maybeSingle();
    if (s) { captureSessionGuest(s); businessId = s.business_id || businessId; resolvedTableId = resolvedTableId || (IS_UUID(s.table_id) ? s.table_id : null); if (!rawTable) { rawTable = s.table_number || ''; normTable = normalizeTable(rawTable); } }
  } else if (resolvedTableId || rawTable) {
    let q = supabase.from('dine_in_sessions').select(SESSION_GUEST_COLUMNS).in('status', ['open', 'bill_requested']).order('created_at', { ascending: false }).limit(1);
    q = resolvedTableId ? q.eq('table_id', resolvedTableId) : q.eq('business_id', businessId).or(tableOr);
    const { data: s } = await q.maybeSingle();
    if (s) { captureSessionGuest(s); targetSessionId = s.id; businessId = s.business_id || businessId; resolvedTableId = resolvedTableId || (IS_UUID(s.table_id) ? s.table_id : null); if (!rawTable) { rawTable = s.table_number || ''; normTable = normalizeTable(rawTable); } }
  }

  // ── Venue Credit & Subscription Guard ──────────────────────────────────────
  // RULE (a): Zero guest checkout if venue wallet balance < 0 or subscription is inactive
  if (businessId) {
    const { checkVenueBillingGuard } = await import('@/lib/services/billing/venue-guard.service');
    const guard = await checkVenueBillingGuard(businessId, supabase);
    if (!guard.allowed) {
      const err: any = new Error(guard.reason || 'Venue suspended');
      err.status = guard.status || 402;
      err.code = guard.code || 'venue_suspended';
      err.details = guard.details;
      throw err;
    }
  }

  if (!resolvedOrder && (targetSessionId || rawTable)) {
    const q = targetSessionId
      ? supabase.from('orders').select('id, business_id, session_id, table_id, table_number, customer_name, customer_phone, grand_total, subtotal').eq('session_id', targetSessionId).order('created_at', { ascending: false }).limit(1)
      : supabase.from('orders').select('id, business_id, session_id, table_id, table_number, customer_name, customer_phone, grand_total, subtotal').eq('business_id', businessId).or(tableOr).order('created_at', { ascending: false }).limit(1);
    const { data: ord, error: ordLookupErr } = await q.maybeSingle();
    if (ordLookupErr) throw ordLookupErr;
    if (ord) resolvedOrder = ord;
  }

  const finalOrderId: string | null = resolvedOrder?.id || (IS_UUID(order_id) ? order_id : null);
  const settledTotal = Number(
    body?.grand_total || body?.subtotal || resolvedOrder?.grand_total || resolvedOrder?.total_amount || resolvedOrder?.subtotal || 0
  );
  // Precedence here MUST mirror how the guest reads their own wallet in
  // components/guest/lobby/useGuestWallet.ts (handle -> phone -> name), so the
  // credit lands on the same key the guest queries with. The session-derived
  // handle wins over anything the POS body happens to send.
  const guestHandle = sessionGuestHandle || body?.guest_handle || null;
  const guestName = sessionGuestName || resolvedOrder?.customer_name || body?.customer_name || body?.guest_name || null;
  const guestPhone = resolvedOrder?.customer_phone || body?.customer_phone || null;
  // Cashback goes only to a real guest identity (handle → phone → name) and only
  // when the host left the receipt's cashback switch on. It used to fall back to
  // a session/table id, minting wallet balances no guest can ever see or spend.
  const creditCashback = body?.credit_cashback !== false;
  const primaryGuestId = creditCashback ? (guestHandle || guestPhone || guestName || null) : null;

  // A wallet redemption must be able to fund this bill before anything is written: a
  // rejected code must leave the order open, not half-updated. The RPC re-checks the same rules.
  const redemptionCode: string | null = body?.redemption_code || body?.redemptionCode || null;
  if (redemptionCode) {
    await assertRedemptionSettleable(supabase, {
      code: String(redemptionCode),
      businessId,
      orderId: finalOrderId,
      discountAmount: Number(body?.discount_amount) || 0,
      subtotal: Number(body?.subtotal) || Number(resolvedOrder?.subtotal) || undefined,
    });
  }

  // Billing fields (tender, line items, tax, discount) go into the same transaction as the
  // settlement. They used to be written first in a separate statement, so a settlement that
  // was then rejected left the order's items and discount changed while it stayed open.
  // Tender is only sent when the POS sent a valid one: a default here overwrote the CASH/CARD
  // tender the receipt had saved, so table bills showed as UPI in EOD and Z-reports.
  const tender = String(body?.payment_method || '').toUpperCase();
  const billing = {
    ...(TENDERS.includes(tender) ? { payment_method: tender } : {}),
    ...(Array.isArray(body?.final_items) ? { items: body.final_items } : {}),
    subtotal: Number(body?.subtotal) || 0,
    tax_amount: Number(body?.tax_amount) || 0,
    discount_amount: Number(body?.discount_amount) || 0,
    discount_type: body?.discount_type || 'flat',
    discount_value: Number(body?.discount_value) || 0,
  };

  // ── Atomic settlement: billing fields, order status, session close, table vacate,
  // redemption and 7% cashback all happen inside one Postgres transaction. Any failure
  // (a rejected code, a short wallet, a missing row) rolls the whole settlement back.
  const { data: settlementRpc, error: settlementErr } = await supabase.rpc('execute_atomic_bill_settlement', {
    p_session_id: targetSessionId,
    p_order_id: finalOrderId,
    p_table_number: rawTable || null,
    p_business_id: businessId,
    p_grand_total: settledTotal,
    p_subtotal: Number(body?.subtotal || resolvedOrder?.subtotal || settledTotal) || 0,
    p_discount_amount: Number(body?.discount_amount) || 0,
    p_discount_type: body?.discount_type || 'percentage',
    p_redemption_code: redemptionCode,
    p_guest_id: primaryGuestId,
    p_guest_handle: creditCashback ? guestHandle : null,
    p_billing: finalOrderId ? billing : null,
  });

  if (settlementErr) throw settlementErr;
  if (!settlementRpc?.success) {
    const err: any = new Error(settlementRpc?.error || 'Atomic bill settlement failed');
    err.status = 409;
    throw err;
  }

  const cashbackResult = { cashback_amount: Number(settlementRpc.cashback_credited || 0) };
  const redemptionResult = redemptionCode
    ? { redeemed_amount: Number(settlementRpc.redeemed_amount || 0) }
    : null;

  // The bill's owner, recorded once at settlement: the guest's invoices are read from this
  // (guest-bills.service), never from the table's shared session. Best-effort: the column
  // only exists once migration 20261010000017 is applied.
  const ownerHandle = typeof guestHandle === 'string' ? guestHandle.trim().toLowerCase() : '';
  if (finalOrderId && ownerHandle.startsWith('@')) {
    const { error: ownerErr } = await supabase.from('orders').update({ guest_handle: ownerHandle })
      .eq('id', finalOrderId).eq('business_id', businessId);
    if (ownerErr && !['42703', 'PGRST204'].includes(ownerErr.code)) console.error('[Settlement] Could not record the bill owner:', ownerErr);
  }

  // Secondary cleanup: any other stray open order rows for this session/table (legacy
  // multi-row edge case). Best-effort — logged on failure, does not block settlement
  // since the primary order above is already atomically settled.
  try {
    // The settled order's own session must close too. The settlement closes the session it
    // was given, which can be a different one; the order's session then stayed open for good,
    // and the next guest at the table joined it.
    const orderSessionId = resolvedOrder?.session_id;
    if (IS_UUID(orderSessionId) && orderSessionId !== targetSessionId) {
      await supabase.from('dine_in_sessions').update({ status: 'closed', updated_at: nowIso })
        .eq('id', orderSessionId).eq('business_id', businessId);
    }
    if (targetSessionId) {
      await supabase.from('orders').update({ status: 'settled' })
        .eq('session_id', targetSessionId).neq('id', finalOrderId || '')
        .not('status', 'in', '("settled","SETTLED","completed","COMPLETED","cancelled","CANCELLED")');
    }
    if (targetSessionId) {
      await supabase.from('bill_request_events').update({ settled_at: nowIso }).eq('session_id', targetSessionId).is('settled_at', null);
    }
    if (rawTable && tableOr) {
      await supabase.from('bill_request_events').update({ settled_at: nowIso }).eq('business_id', businessId).or(tableOr).is('settled_at', null);
    }
  } catch (cleanupErr) {
    console.error('[Settlement] Secondary cleanup (stray orders / bill requests) failed:', cleanupErr);
  }

  // ── Recipe-driven inventory deduction ──────────────────────────────────────
  // Atomic RPC only — the non-atomic per-ingredient fallback was a stock-count race
  // condition and has been removed. A failure here does not block settlement (the
  // guest has already been billed) but is surfaced in the response for ops to reconcile.
  let inventoryResult: any = { success: true };
  if (finalOrderId) {
    const { deductInventoryForOrder } = await import('@/lib/services/inventory/recipe-deduction.service');
    try {
      inventoryResult = await deductInventoryForOrder(supabase, finalOrderId, businessId);
    } catch (invErr: any) {
      console.error('[Settlement] Inventory deduction failed for order', finalOrderId, invErr);
      inventoryResult = { success: false, error: invErr?.message || String(invErr) };
    }
  }

  // ── Platform fee deduction ─────────────────────────────────────────────────
  // By design the POS flow is never blocked by a fee-deduction failure (see
  // fee-guard.service.ts) — it always lands in venue_outstanding_bills as a fallback.
  let platformFeeResult: any = null;
  if (businessId && finalOrderId) {
    const { evaluateFeeGuard } = await import('@/lib/services/wallet/fee-guard.service');
    const feeIdempotencyKey = `SETTLE_${finalOrderId}`;
    platformFeeResult = await evaluateFeeGuard(businessId, 'bill_generate', feeIdempotencyKey, supabase);
  }

  // Realtime notification to this venue's guest table (non-fatal UI nicety;
  // awaited so it finishes before the serverless response returns).
  await broadcastToGuestTable(supabase, businessId, rawTable, 'table_settled', {
    table_number: rawTable,
    settled_total: settledTotal,
    cashback: cashbackResult.cashback_amount,
    redeemed: redemptionResult?.redeemed_amount,
    platform_fee: platformFeeResult?.cost,
  });

  return {
    success: true,
    message: 'Table marked vacant, session closed, and order settled',
    status: 'VACANT',
    cashback: cashbackResult,
    redemption: redemptionResult,
    inventory: inventoryResult,
    platform_fee: platformFeeResult,
  };
}

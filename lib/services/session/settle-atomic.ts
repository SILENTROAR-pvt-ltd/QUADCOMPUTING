import { stripTax } from '@/lib/services/billing/gst-policy';
import { TENDERS } from './settle-input';

/** Billing fields that go into the same transaction as the settlement. Tender only when the POS sent a valid one. */
export function billingFields(body: any) {
  const tender = String(body?.payment_method || '').toUpperCase();
  return {
    ...(TENDERS.includes(tender) ? { payment_method: tender } : {}),
    ...(Array.isArray(body?.final_items) ? { items: body.final_items } : {}),
    subtotal: Number(body?.subtotal) || 0,
    tax_amount: Number(body?.tax_amount) || 0,
    discount_amount: Number(body?.discount_amount) || 0,
    discount_type: body?.discount_type || 'flat',
    discount_value: Number(body?.discount_value) || 0,
  };
}

/** GST only for a verified GSTIN (gst-policy.ts). Where the venue may not charge it, the tax comes off the total. */
export function applyGstPolicy<B extends { tax_amount: number }>(gst: { canCharge: boolean }, billing: B, settledTotal: number) {
  if (gst.canCharge || !(billing.tax_amount > 0)) return { billing, settledTotal };
  return {
    billing: { ...billing, tax_amount: 0 },
    settledTotal: stripTax({ taxAmount: billing.tax_amount, grandTotal: settledTotal }).grandTotal,
  };
}

export interface AtomicSettlementArgs {
  sessionId: string | null;
  orderId: string | null;
  rawTable: string;
  businessId: string;
  grandTotal: number;
  subtotal: number;
  discountAmount: number;
  discountType: string;
  redemptionCode: string | null;
  guestId: string | null;
  guestHandle: string | null;
  billing: object | null;
}

/**
 * The one database transaction that settles a bill: billing fields, order status, session close, table vacate,
 * redemption and cashback. A failure (a rejected code, a short wallet, a missing row) rolls all of it back.
 */
export async function executeAtomicSettlement(supabase: any, a: AtomicSettlementArgs): Promise<any> {
  const { data: settlementRpc, error } = await supabase.rpc('execute_atomic_bill_settlement', {
    p_session_id: a.sessionId,
    p_order_id: a.orderId,
    p_table_number: a.rawTable || null,
    p_business_id: a.businessId,
    p_grand_total: a.grandTotal,
    p_subtotal: a.subtotal,
    p_discount_amount: a.discountAmount,
    p_discount_type: a.discountType,
    p_redemption_code: a.redemptionCode,
    p_guest_id: a.guestId,
    p_guest_handle: a.guestHandle,
    p_billing: a.billing,
  });
  if (error) throw error;
  if (!settlementRpc?.success) {
    const err: any = new Error(settlementRpc?.error || 'Atomic bill settlement failed');
    err.status = 409;
    throw err;
  }
  return settlementRpc;
}

import { buildTableOrFilter } from './session-entry.util';

const TENDERS = ['CASH', 'UPI', 'CARD'];
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Turns a waiter's "settle this table" into the same settlement the billing POS sends. The waiter only picks how the
 * guest paid; the wallet cashback the guest set aside for this table (when they asked for the bill) is found here and
 * applied as the bill's discount, so the guest is never charged for it and no code has to be read out.
 */
export async function buildWaiterSettlement(body: any, supabase: any, businessId: string) {
  const tableNumber = String(body?.table_number || '').trim();
  if (!tableNumber) throw new Error('Missing table number');
  const tender = String(body?.payment_method || '').toUpperCase();
  if (!TENDERS.includes(tender)) throw new Error('Invalid payment method: choose cash, UPI or card');

  const subtotal = round2(body?.subtotal);
  const tax = round2(body?.tax_amount);
  const total = round2(body?.grand_total || subtotal + tax);

  // The guest's open cashback for this table, if any: newest first, still usable.
  const { data: redemption, error } = await supabase.from('wallet_redemptions')
    .select('code, amount')
    .eq('business_id', businessId)
    .or(buildTableOrFilter(tableNumber))
    .in('status', ['pending', 'verified'])
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  // Cashback is a courtesy: if it cannot be read the bill is still settled at its full amount.
  if (error) console.error('[waiterSettle] Could not read the guest cashback:', error.message);

  const discount = redemption ? round2(Math.min(Number(redemption.amount) || 0, subtotal)) : 0;

  return {
    business_id: businessId,
    table_number: tableNumber,
    order_id: body?.order_id,
    payment_method: tender,
    subtotal,
    tax_amount: tax,
    grand_total: round2(Math.max(0, total - discount)),
    ...(discount > 0
      ? { redemption_code: redemption!.code, discount_amount: discount, discount_type: 'flat', discount_value: discount }
      : {}),
    wallet_applied: discount,
  };
}

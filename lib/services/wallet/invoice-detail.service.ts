import { SETTLED_STATUSES } from '@/lib/utils/business-day';
import { normaliseBill } from '@/lib/services/analytics/z-report-sales.util';
import { feeReferenceFor, invoiceNumberFor, placeFor, type FeeStatus } from './invoice-history.util';

export const INVOICE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface InvoiceDetail {
  id: string;
  invoice_number: string;
  created_at: string;
  place: string;
  guest: string | null;
  phone: string | null;
  payment_method: string | null;
  items: Array<{ name: string; qty: number; price: number; amount: number; notes: string | null }>;
  subtotal: number;
  discount: number;
  tax: number;
  delivery_fee: number;
  total: number;
  fee: number;
  fee_status: FeeStatus;
}

const num = (v: unknown) => Number(v) || 0;
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * One settled bill for the host: its items, discount, tax, payment and fee status. Only this venue's own bill is read
 * (business_id is checked in the same query), and the fee is read by its own reference. Null when there is no such bill.
 */
export async function fetchInvoiceDetail(db: any, businessId: string, orderId: string): Promise<InvoiceDetail | null> {
  const { data: order, error } = await db.from('orders')
    .select('id, created_at, status, invoice_number, table_number, customer_name, customer_phone, payment_method, items, subtotal, discount_amount, tax_amount, grand_total, is_delivery, delivery_fee')
    .eq('id', orderId).eq('business_id', businessId).maybeSingle();
  if (error) throw error;
  if (!order || !SETTLED_STATUSES.includes(order.status)) return null;

  const bill = normaliseBill(order);
  const lines = Array.isArray(bill.items) ? bill.items : [];
  const items = lines.map((l: any) => {
    const qty = num(l?.qty ?? l?.quantity) || 1;
    const price = num(l?.price ?? l?.unit_price);
    return {
      name: String(l?.name ?? l?.item_name ?? 'Item'),
      qty,
      price: r2(price),
      amount: r2(price * qty),
      notes: l?.notes ? String(l.notes) : null,
    };
  });

  const [due, ledger] = await Promise.all([
    db.from('venue_outstanding_bills').select('amount, status').eq('venue_id', businessId).eq('reference_id', feeReferenceFor(order.id)).maybeSingle(),
    db.from('usage_ledger').select('cost').eq('venue_id', businessId).eq('action_type', 'bill_generate').eq('reference_id', feeReferenceFor(order.id)).maybeSingle(),
  ]);
  const fee = due.data ? num(due.data.amount) : ledger.data ? Math.max(0, num(ledger.data.cost)) : 0;
  const fee_status: FeeStatus = due.data ? (due.data.status === 'paid' ? 'cleared' : 'due') : ledger.data && num(ledger.data.cost) > 0 ? 'deducted' : 'none';

  const guest = String(order.customer_name ?? '').trim();
  return {
    id: order.id,
    invoice_number: invoiceNumberFor(order),
    created_at: order.created_at,
    place: placeFor(order),
    guest: guest && !/^guest$/i.test(guest) ? guest : null,
    phone: order.customer_phone ? String(order.customer_phone) : null,
    payment_method: order.payment_method ? String(order.payment_method).toUpperCase() : null,
    items,
    subtotal: r2(num(bill.subtotal)),
    discount: r2(num(order.discount_amount)),
    tax: r2(num(bill.tax_amount)),
    delivery_fee: r2(num(order.delivery_fee)),
    total: r2(num(order.grand_total)),
    fee: r2(fee),
    fee_status,
  };
}

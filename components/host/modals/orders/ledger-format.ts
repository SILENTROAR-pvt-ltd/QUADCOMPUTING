import type { LedgerOrder } from '@/lib/services/analytics/orders-ledger.util';
import type { InvoiceData } from '@/lib/utils/receipt-adapter';

export const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export const istDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });

export const istDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });

export const billNo = (o: LedgerOrder) => o.invoice_number || o.id.split('-')[0].toUpperCase();

export type StatusFilter = 'all' | 'settled' | 'open' | 'cancelled';

export function statusOf(o: LedgerOrder): Exclude<StatusFilter, 'all'> {
  if (o.status === 'settled') return 'settled';
  if (o.status === 'cancelled') return 'cancelled';
  return 'open';
}

export function matchesSearch(o: LedgerOrder, q: string): boolean {
  if (!q) return true;
  const hay = [o.guest.label, o.guest.handle, o.guest.phone, o.table_number, billNo(o), o.payment_method]
    .filter(Boolean).join(' ').toLowerCase();
  return hay.includes(q.toLowerCase());
}

export function itemsSummary(o: LedgerOrder): string {
  return (o.items as any[]).map((i) => `${Number(i?.qty ?? i?.quantity) || 1}× ${i?.name || 'Item'}`).join(', ');
}

/** The receipt for a stored bill, with the guest as resolved on the server. */
export function toInvoice(o: LedgerOrder): InvoiceData {
  return {
    id: o.id,
    created_at: o.created_at,
    guest_name: o.guest.name || undefined,
    guest_handle: o.guest.handle || undefined,
    guest_phone: o.guest.phone || undefined,
    table_number: o.table_number || undefined,
    payment_method: o.payment_method || undefined,
    items: (o.items as any[]).map((i) => ({ id: i?.id, name: i?.name || 'Item', price: Number(i?.price) || 0, qty: Number(i?.qty ?? i?.quantity) || 1, notes: i?.notes })),
    subtotal: o.subtotal,
    discountType: o.discount_type === 'percentage' ? 'percentage' : 'flat',
    discountValue: o.discount_value,
    discountAmount: o.discount_amount,
    taxAmount: o.tax_amount,
    grandTotal: o.grand_total,
    wallet_redeemed: o.wallet.redeemed,
    wallet_cashback: o.wallet.cashback,
    isReadOnly: true,
  };
}

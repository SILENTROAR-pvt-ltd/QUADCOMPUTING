import type { InvoiceData } from '@/lib/utils/receipt-adapter';

/** The room bill as the desk issued it, as the guest's pages receive it (check-in and in-room). */
export interface StayInvoiceView {
  invoice_id: string | null; paid_at: string; payment_method: string; amount: number; guest_name: string;
  lines: Array<{ id: string; name: string; price: number; qty: number; notes?: string }>;
}

/** The same tax invoice the desk printed, in the shape the platform's receipt renders. */
export function stayInvoiceData(v: StayInvoiceView, destination: string | null): InvoiceData {
  return {
    id: v.invoice_id || undefined, created_at: v.paid_at, guest_name: v.guest_name, table_number: destination || 'Room',
    items: v.lines.map((l) => ({ id: l.id, name: l.name, price: l.price, qty: l.qty, notes: l.notes, section: l.id === 'tariff' ? 'ACCOMMODATION' : 'ADD_ON' })),
    subtotal: v.amount, discountAmount: 0, taxAmount: 0, grandTotal: v.amount, isReadOnly: true,
  };
}

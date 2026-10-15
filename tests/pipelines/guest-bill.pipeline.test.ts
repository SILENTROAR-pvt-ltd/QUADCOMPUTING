import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { loadSettledOrderBill, SETTLED_BILL_WINDOW_MS } from '@/lib/services/guest-auth/guest-bills.service';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER_BIZ = 'cccccccc-1111-4222-8333-444444444444';
const ORDER = 'bbbbbbbb-2222-4333-8444-555555555555';
const NOW = new Date('2026-10-15T12:00:00.000Z');
const recent = new Date(NOW.getTime() - 60 * 60 * 1000).toISOString();

const db = (over: Record<string, unknown> = {}) => createFakeSupabase({
  businesses: [{ id: BIZ, business_name: 'Bombay Rasoi', gst_number: '07ABCDE1234F1Z5' }],
  locations: [],
  orders: [{
    id: ORDER, business_id: BIZ, status: 'settled', table_number: 'T-01', created_at: recent, updated_at: recent,
    customer_name: 'Reshav', customer_phone: '9876543210', payment_method: 'UPI',
    items: [{ name: 'Farm House Pizza', price: 250, qty: 1 }],
    subtotal: 250, tax_amount: 12.5, discount_amount: 0, grand_total: 262.5, ...over,
  }],
  order_items: [],
});

describe("the guest's copy of the venue's bill", () => {
  it('returns the same invoice the host prints: items, tax, total, venue GSTIN, invoice number', async () => {
    const bill = await loadSettledOrderBill(db(), BIZ, ORDER, 'T-01', NOW);
    expect(bill).toMatchObject({ invoice_no: 'BBBBBBBB', grand_total: 262.5, venue: { name: 'Bombay Rasoi', gstin: '07ABCDE1234F1Z5' } });
    expect(bill?.invoice).toMatchObject({ subtotal: 250, taxAmount: 12.5, grandTotal: 262.5, isReadOnly: true });
    expect(bill?.invoice.items).toEqual([expect.objectContaining({ name: 'Farm House Pizza', price: 250, qty: 1 })]);
  });

  it('never includes the guest phone number', async () => {
    const bill = await loadSettledOrderBill(db(), BIZ, ORDER, 'T-01', NOW);
    expect(JSON.stringify(bill)).not.toContain('9876543210');
  });

  it('reads the table loosely ("Table T-01" is "T-01") but not another table', async () => {
    expect(await loadSettledOrderBill(db(), BIZ, ORDER, 'Table T-01', NOW)).not.toBeNull();
    expect(await loadSettledOrderBill(db(), BIZ, ORDER, 'T-02', NOW)).toBeNull();
  });

  it('is not given to anyone who cannot name the order, or names it at another venue', async () => {
    expect(await loadSettledOrderBill(db(), BIZ, 'not-a-uuid', 'T-01', NOW)).toBeNull();
    expect(await loadSettledOrderBill(db(), BIZ, 'dddddddd-2222-4333-8444-555555555555', 'T-01', NOW)).toBeNull();
    expect(await loadSettledOrderBill(db(), OTHER_BIZ, ORDER, 'T-01', NOW)).toBeNull();
  });

  it('is only for a settled bill, and only for two days after', async () => {
    expect(await loadSettledOrderBill(db({ status: 'open' }), BIZ, ORDER, 'T-01', NOW)).toBeNull();
    const old = new Date(NOW.getTime() - SETTLED_BILL_WINDOW_MS - 60_000).toISOString();
    expect(await loadSettledOrderBill(db({ created_at: old, updated_at: old }), BIZ, ORDER, 'T-01', NOW)).toBeNull();
  });
});

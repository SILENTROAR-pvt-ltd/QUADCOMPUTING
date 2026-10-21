import { describe, it, expect } from 'vitest';
import { buildZFigures } from '@/lib/services/analytics/eod-z-report.util';
import { normaliseBill } from '@/lib/services/analytics/z-report-sales.util';
import { resolveGuestIdentity } from '@/lib/services/analytics/guest-identity.util';
import { buildLedger } from '@/lib/services/analytics/orders-ledger.util';

const misal = { name: 'Misal Pav', price: 200, qty: 1 };
const bill = (over: Record<string, unknown>) => ({
  status: 'settled', subtotal: 200, discount_amount: 0, tax_amount: 10, grand_total: 210,
  payment_method: 'UPI', created_at: '2026-10-08T09:00:00Z', items: [misal], ...over,
});

describe('End-of-day Z-report figures', () => {
  const orders = [
    bill({ id: 'a', customer_phone: '9000000001' }),
    // Wallet credit is taken off as a flat discount; GST on the reduced value, bill rounded.
    bill({ id: 'b', discount_amount: 14, tax_amount: 9.3, grand_total: 195, payment_method: 'CASH', customer_phone: '9000000001' }),
    // Saved with a total but no breakdown.
    bill({ id: 'c', subtotal: 0, tax_amount: 0, grand_total: 210, payment_method: 'SPLIT', session_id: 's1' }),
    bill({ id: 'd', status: 'open', grand_total: 420 }),
    bill({ id: 'e', status: 'cancelled', grand_total: 99 }),
  ];
  const z = buildZFigures(orders, 14, (n) => (n === 'Misal Pav' ? 'Quick Bites' : null));

  it('reconciles gross, discounts, tax and rounding to what the bills charged', () => {
    expect(z.summary).toMatchObject({ gross_sales: 600, discounts: 14, wallet_redeemed: 14, net_sales: 586, total_tax: 29.3, grand_total: 615 });
    expect(z.summary.cgst + z.summary.sgst).toBeCloseTo(29.3, 2);
    expect(z.summary.round_off).toBeCloseTo(-0.3, 2);
  });

  it('splits tenders and keeps open bills and voids out of sales', () => {
    // Cash bills without a recorded tender count as exact cash: received equals the sales, nothing returned.
    expect(z.tenders).toEqual({ cash: 195, upi: 210, card: 0, other: 210, cash_received: 195, change_given: 0 });
    expect(z.operations).toMatchObject({ settled_bills: 3, open_bills: 1, open_value: 420, voids: 1, void_value: 99, guests: 2 });
  });

  it('breaks sales down by catalogue category and dish', () => {
    expect(z.categories).toEqual([{ name: 'Quick Bites', qty: 3, net_sales: 586, share: 100 }]);
    expect(z.items[0]).toMatchObject({ name: 'Misal Pav', qty: 3, net_sales: 586 });
    expect(z.hourly).toEqual([{ hour: '14:00', bills: 3, sales: 615 }]);
  });

  it('leaves a bill with a proper breakdown untouched', () => {
    const o = bill({ id: 'x' });
    expect(normaliseBill(o)).toBe(o);
  });
});

describe('Who a bill belongs to', () => {
  it('prefers a real name, then the wallet handle, then the phone', () => {
    expect(resolveGuestIdentity({ customer_name: 'Harshit' }, '@babaaps').label).toBe('Harshit');
    expect(resolveGuestIdentity({ customer_name: 'Guest' }, '@babaaps')).toMatchObject({ name: null, handle: '@babaaps', label: '@babaaps' });
    expect(resolveGuestIdentity({ customer_phone: '9000000001' }).label).toBe('9000000001');
    expect(resolveGuestIdentity({}, 'Guest', null).label).toBe('Walk-in guest');
  });

  it('takes the handle from the table session first, then the wallet ledger, with the wallet amounts', () => {
    const [row] = buildLedger(
      [bill({ id: 'o1', customer_name: 'Harshit', session_id: 's1', discount_amount: 14 })],
      [{ id: 's1', guest_handle: '@babaaps' }],
      [
        { order_id: 'o1', guest_id: '@baba_aps', transaction_type: 'REDEMPTION', amount: 14 },
        { order_id: 'o1', guest_id: '@baba_aps', transaction_type: 'CASHBACK', amount: 14 },
      ],
    );
    expect(row.guest).toMatchObject({ name: 'Harshit', handle: '@babaaps' });
    expect(row.wallet).toEqual({ redeemed: 14, cashback: 14 });
  });
});

import { describe, expect, it } from 'vitest';
import { buildInvoiceRows, feeReferenceFor, invoiceNumberFor, placeFor, sumRevenue } from './invoice-history.util';

const ID = '4948e690-78a9-4f0b-8865-28784fd533dd';
const order = (over: Record<string, unknown> = {}) => ({
  id: ID, created_at: '2026-10-12T14:30:00.000Z', status: 'settled', grand_total: 480, table_number: 'T-03', payment_method: 'upi',
  customer_name: 'Asha', invoice_number: null, ...over,
}) as any;

describe('invoiceNumberFor', () => {
  it("keeps a bill's own invoice number", () => {
    expect(invoiceNumberFor(order({ invoice_number: 'INV-77' }))).toBe('INV-77');
  });

  it('makes a stable number from the id and the bill year when there is none', () => {
    expect(invoiceNumberFor(order())).toBe('QC-2026-4948E690');
    expect(invoiceNumberFor(order())).toBe(invoiceNumberFor(order()));
  });
});

describe('placeFor', () => {
  it('names the table, delivery or counter', () => {
    expect(placeFor({ table_number: 'T-03' })).toBe('T-03');
    expect(placeFor({ table_number: '7' })).toBe('Table 7');
    expect(placeFor({ table_number: 'DLV-AB12CD34' })).toBe('Delivery');
    expect(placeFor({ table_number: null, is_delivery: true })).toBe('Delivery');
    expect(placeFor({ table_number: '' })).toBe('Counter');
  });
});

describe('sumRevenue', () => {
  it('counts settled bills only, in either spelling, and leaves out open and cancelled bills', () => {
    const total = sumRevenue([
      { status: 'settled', grand_total: 100 },
      { status: 'SETTLED', grand_total: '250.50' },
      { status: 'open', grand_total: 999 },
      { status: 'cancelled', grand_total: 400 },
    ]);
    expect(total).toEqual({ revenue: 350.5, count: 2 });
  });
});

describe('buildInvoiceRows', () => {
  it('takes the fee from the dues when it is still due', () => {
    const rows = buildInvoiceRows([order()], [{ reference_id: feeReferenceFor(ID), amount: 3, status: 'unpaid' }], []);
    expect(rows[0]).toMatchObject({ invoice_number: 'QC-2026-4948E690', grand_total: 480, fee: 3, fee_status: 'due', where: 'T-03', guest: 'Asha', payment_method: 'UPI' });
  });

  it('marks a cleared due and a wallet deduction', () => {
    const other = order({ id: '11111111-2222-3333-4444-555555555555' });
    const rows = buildInvoiceRows(
      [order(), other],
      [{ reference_id: feeReferenceFor(ID), amount: 3, status: 'paid' }],
      [{ reference_id: feeReferenceFor(other.id), cost: 3 }],
    );
    expect(rows.map((r) => [r.fee, r.fee_status])).toEqual([[3, 'cleared'], [3, 'deducted']]);
  });

  it('shows no fee for a bill that was free, and hides the placeholder guest name', () => {
    const [row] = buildInvoiceRows([order({ customer_name: 'Guest' })], [], [{ reference_id: feeReferenceFor(ID), cost: 0 }]);
    expect(row).toMatchObject({ fee: 0, fee_status: 'none', guest: null });
  });

  it('leaves open and cancelled bills out of the history', () => {
    expect(buildInvoiceRows([order({ status: 'open' }), order({ status: 'cancelled' })], [], [])).toEqual([]);
  });
});

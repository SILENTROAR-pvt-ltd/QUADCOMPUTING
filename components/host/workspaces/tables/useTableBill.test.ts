import { describe, it, expect } from 'vitest';
import { shifted } from './useTableBill';

describe('a table bill while a change is on its way to the server', () => {
  it('moves the subtotal and keeps the bill\'s tax rate', () => {
    const next = shifted({ subtotal: 200, tax_amount: 10, grand_total: 210 } as any, 100);
    expect(next).toMatchObject({ subtotal: 300, grand_total: 315, tax_amount: 15 });
  });

  it('never goes below zero', () => {
    expect(shifted({ subtotal: 50, tax_amount: 0, grand_total: 50 } as any, -500)).toMatchObject({ subtotal: 0, grand_total: 0 });
  });

  it('leaves a table with no order alone', () => {
    expect(shifted(null, 100)).toBeNull();
  });
});

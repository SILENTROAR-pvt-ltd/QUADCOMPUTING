// The cashback a guest is shown before ordering is exactly what the settlement function credits: 7% of the subtotal,
// to the paisa (round(subtotal * 0.07, 2) in supabase/migrations/20261009000003_cashback_on_full_bill.sql).
import { describe, expect, it } from 'vitest';
import { CASHBACK_PERCENT, cashbackFor, rupees } from './cashback';

describe('Cashback shown at checkout', () => {
  it('is 7% of the subtotal to the paisa, never rounded up to whole rupees', () => {
    expect(CASHBACK_PERCENT).toBe(7);
    expect(cashbackFor(40)).toBe(2.8);
    expect(cashbackFor(100)).toBe(7);
    expect(cashbackFor(149)).toBe(10.43);
    expect(cashbackFor(0)).toBe(0);
    expect(cashbackFor(-50)).toBe(0);
  });

  it('formats rupees with paise only when there are any', () => {
    expect(rupees(3)).toBe('₹3');
    expect(rupees(2.8)).toBe('₹2.80');
    expect(rupees(1250.5)).toBe('₹1,250.50');
    expect(rupees(125000)).toBe('₹1,25,000');
    expect(rupees(Number.NaN)).toBe('₹0');
  });
});

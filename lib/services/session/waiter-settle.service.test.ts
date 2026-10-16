import { describe, expect, it, vi } from 'vitest';
import { buildWaiterSettlement } from './waiter-settle.service';

/** A fake supabase whose wallet_redemptions query resolves to `row` (or an error). */
function db(row: any, error: any = null) {
  const chain: any = {};
  for (const m of ['select', 'eq', 'or', 'in', 'gt', 'order', 'limit']) chain[m] = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => ({ data: row, error }));
  return { from: vi.fn(() => chain) };
}

const BIZ = '189664b2-99e7-4d45-ac50-ffb647ef97df';

describe('buildWaiterSettlement', () => {
  it('settles at the full bill when the guest set no cashback aside', async () => {
    const out = await buildWaiterSettlement({ table_number: 'T-01', payment_method: 'cash', subtotal: 150, tax_amount: 0, grand_total: 150 }, db(null), BIZ);
    expect(out.payment_method).toBe('CASH');
    expect(out.grand_total).toBe(150);
    expect(out).not.toHaveProperty('redemption_code');
  });

  it('applies the cashback the guest set aside as the discount', async () => {
    const out = await buildWaiterSettlement({ table_number: 'T-01', payment_method: 'UPI', subtotal: 150, tax_amount: 0, grand_total: 150 }, db({ code: 'AB12', amount: 40 }), BIZ);
    expect(out.redemption_code).toBe('AB12');
    expect(out.discount_amount).toBe(40);
    expect(out.grand_total).toBe(110);
  });

  it('never discounts more than the bill subtotal', async () => {
    const out = await buildWaiterSettlement({ table_number: 'T-01', payment_method: 'CARD', subtotal: 30, tax_amount: 0, grand_total: 30 }, db({ code: 'ZZ99', amount: 500 }), BIZ);
    expect(out.discount_amount).toBe(30);
    expect(out.grand_total).toBe(0);
  });

  it('still settles at the full bill when the cashback cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = await buildWaiterSettlement({ table_number: 'T-01', payment_method: 'CASH', subtotal: 100, tax_amount: 5, grand_total: 105 }, db(null, { message: 'boom' }), BIZ);
    expect(out.grand_total).toBe(105);
    expect(out).not.toHaveProperty('redemption_code');
  });

  it('rejects a missing table or an unknown payment method', async () => {
    await expect(buildWaiterSettlement({ payment_method: 'CASH' }, db(null), BIZ)).rejects.toThrow(/table/i);
    await expect(buildWaiterSettlement({ table_number: 'T-01', payment_method: 'BARTER' }, db(null), BIZ)).rejects.toThrow(/payment method/i);
  });
});

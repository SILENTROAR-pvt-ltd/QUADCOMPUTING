import { describe, it, expect } from 'vitest';
import {
  getTableKey,
  findActiveOrder,
  saveActiveOrder,
  closeActiveOrder,
  ActiveOrderRecord,
} from '../store/active-order-store';
import {
  calculateRunningTotal,
  computeSettledTotal,
  checkHasActiveOrder,
} from '../../components/guest/menu/hooks/order-totals.util';

describe('Table Session Isolation & State Scoping', () => {
  const businessId = 'test-biz-uuid';

  it('generates distinct table keys for T-01 vs T-02 and does not default empty to 01', () => {
    const keyT1 = getTableKey(businessId, 'T-01');
    const keyT2 = getTableKey(businessId, 'T-02');
    const keyEmpty = getTableKey(businessId, '');

    expect(keyT1).not.toBe(keyT2);
    expect(keyT1).toContain('01');
    expect(keyT2).toContain('02');
    expect(keyEmpty).not.toBe(keyT1);
    expect(keyEmpty).toContain('UNSET_TABLE');
  });

  it('strictly isolates in-memory active orders between T-01 and T-02', () => {
    const orderT1: ActiveOrderRecord = {
      id: 'ord_t1',
      business_id: businessId,
      table_number: 'T-01',
      status: 'open',
      subtotal: 450,
      tax_amount: 0,
      grand_total: 450,
      total_amount: 450,
      items: [{ name: 'Espresso', price: 450, quantity: 1 }],
      raw_items: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const orderT2: ActiveOrderRecord = {
      id: 'ord_t2',
      business_id: businessId,
      table_number: 'T-02',
      status: 'open',
      subtotal: 890,
      tax_amount: 0,
      grand_total: 890,
      total_amount: 890,
      items: [{ name: 'Pasta', price: 890, quantity: 1 }],
      raw_items: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveActiveOrder(orderT1);
    saveActiveOrder(orderT2);

    expect(findActiveOrder(businessId, 'T-01')?.id).toBe('ord_t1');
    expect(findActiveOrder(businessId, 'T-02')?.id).toBe('ord_t2');
    expect(findActiveOrder(businessId, 'T-03')).toBeNull();

    // Closing T-01 must never affect T-02
    closeActiveOrder(businessId, 'T-01');
    expect(findActiveOrder(businessId, 'T-01')).toBeNull();
    expect(findActiveOrder(businessId, 'T-02')?.id).toBe('ord_t2');

    // Clean up
    closeActiveOrder(businessId, 'T-02');
    expect(findActiveOrder(businessId, 'T-02')).toBeNull();
  });

  it('correctly calculates order totals and active order presence', () => {
    const items = [
      { price: 200, quantity: 2 },
      { price: 150, quantity: 1 },
    ];
    expect(calculateRunningTotal(items)).toBe(550);
    expect(computeSettledTotal({ grand_total: 600 }, items)).toBe(600);
    expect(checkHasActiveOrder(items, null)).toBe(true);
    expect(checkHasActiveOrder([], { status: 'settled', grand_total: 500 })).toBe(false);
  });
});

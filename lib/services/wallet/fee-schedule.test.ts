import { describe, expect, it } from 'vitest';
import { feeFor } from './fee-guard.service';
import { PAYG_BILL_FEE, PAYG_FEES } from './plans';

describe('pay as you go fee schedule', () => {
  it('charges ₹3 for each settled bill, and only that', () => {
    expect(feeFor('bill_generate', false)).toBe(3);
    expect(PAYG_BILL_FEE).toBe(3);
    expect(PAYG_FEES).toEqual([{ label: 'Each settled bill', amount: 3 }]);
  });

  it('charges nothing for menu items, rooms and add-ons, on any plan', () => {
    for (const action of ['menu_item_creation', 'room_creation', 'room_accommodation', 'menu_addon', 'menu_addon_creation'] as const) {
      expect(feeFor(action, false)).toBe(0);
      expect(feeFor(action, true)).toBe(0);
    }
  });

  it('waives the bill fee on a paid plan', () => {
    expect(feeFor('bill_generate', true)).toBe(0);
  });
});

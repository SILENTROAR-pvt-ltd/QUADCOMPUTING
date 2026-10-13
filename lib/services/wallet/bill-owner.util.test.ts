// Cashback goes to one signed-in guest only when they ordered every dish on the table's bill.
import { describe, expect, it } from 'vitest';
import { billOwner, isSharedSignedInBill } from './bill-owner.util';

describe('Table bill owner', () => {
  it('is the guest who ordered every dish', () => {
    const o = billOwner([{ guest_handle: '@realboss' }, { guest_handle: '@RealBoss' }, { guest_handle: 'realboss' }]);
    expect(o).toEqual({ handle: '@realboss', handles: ['@realboss'], hasUnclaimed: false });
    expect(isSharedSignedInBill(o)).toBe(false);
  });

  it('is nobody when two signed-in guests ordered', () => {
    const o = billOwner([{ guest_handle: '@realboss' }, { guest_handle: '@reshav' }]);
    expect(o.handle).toBeNull();
    expect(o.handles).toEqual(['@realboss', '@reshav']);
    expect(isSharedSignedInBill(o)).toBe(true);
  });

  it('is nobody when a guest without an account also ordered', () => {
    const o = billOwner([{ guest_handle: '@realboss' }, { guest_handle: null }, {}]);
    expect(o).toEqual({ handle: null, handles: ['@realboss'], hasUnclaimed: true });
    expect(isSharedSignedInBill(o)).toBe(true);
  });

  it('has no signed-in guests for an anonymous or older bill', () => {
    const o = billOwner([{ guest_handle: null }, { guest_handle: '  ' }]);
    expect(o).toEqual({ handle: null, handles: [], hasUnclaimed: true });
    expect(isSharedSignedInBill(o)).toBe(false);
    expect(billOwner([])).toEqual({ handle: null, handles: [], hasUnclaimed: false });
  });
});

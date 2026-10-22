import { describe, it, expect } from 'vitest';
import { kotStatusRefusal, SERVED_BY_WAITER } from './kot-status-roles';

describe('who moves a kitchen ticket', () => {
  it('lets the kitchen start and finish an order but not mark it served', () => {
    expect(kotStatusRefusal('CHEF', 'PREPARING')).toBeNull();
    expect(kotStatusRefusal('CHEF', 'READY')).toBeNull();
    expect(kotStatusRefusal('CHEF', 'CANCELLED')).toBeNull();
    expect(kotStatusRefusal('CHEF', 'SERVED')).toBe(SERVED_BY_WAITER);
    expect(kotStatusRefusal('CHEF', 'served')).toBe(SERVED_BY_WAITER);
  });

  it('leaves served to the waiter, the cashier and the owner', () => {
    expect(kotStatusRefusal('WAITER', 'SERVED')).toBeNull();
    expect(kotStatusRefusal('CASHIER', 'SERVED')).toBeNull();
    expect(kotStatusRefusal(undefined, 'SERVED')).toBeNull();
    expect(kotStatusRefusal('CHEF', undefined)).toBeNull();
  });
});

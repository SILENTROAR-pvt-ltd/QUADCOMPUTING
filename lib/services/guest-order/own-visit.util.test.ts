import { describe, expect, it } from 'vitest';
import { ownVisitOrders } from './own-visit.util';

const NOW = Date.parse('2026-10-08T12:00:00Z');
const at = (minsAgo: number) => new Date(NOW - minsAgo * 60_000).toISOString();

describe('ownVisitOrders', () => {
  it('shows only the device own bill, not another guest settled minutes earlier', () => {
    const settled = [
      { id: 'f92eb682', session_id: 's-3', created_at: at(5), grand_total: 210 },
      { id: 'e3ac61d5', session_id: 's-2', created_at: at(12), grand_total: 210 },
      { id: 'e6f19c0d', session_id: 's-1', created_at: at(20), grand_total: 210 },
    ];
    const visit = ownVisitOrders(settled, 'e3ac61d5', NOW);
    expect(visit.own?.id).toBe('e3ac61d5');
    expect(visit.total).toBe(210);
    expect(visit.visitOrders.map((o) => o.id)).toEqual(['e3ac61d5']);
  });

  it('sums every order of the same dine-in session', () => {
    const settled = [
      { id: 'a', session_id: 's-1', created_at: at(30), grand_total: 120 },
      { id: 'b', session_id: 's-1', created_at: at(10), grand_total: 80 },
      { id: 'c', session_id: 's-9', created_at: at(5), grand_total: 999 },
    ];
    const visit = ownVisitOrders(settled, 'a', NOW);
    expect(visit.total).toBe(200);
    expect(visit.visitOrders.map((o) => o.id).sort()).toEqual(['a', 'b']);
  });

  it('returns nothing when the device never took part in the order', () => {
    const settled = [{ id: 'x', session_id: 's-1', created_at: at(5), grand_total: 210 }];
    expect(ownVisitOrders(settled, 'not-mine', NOW).own).toBeNull();
    expect(ownVisitOrders(settled, '', NOW).total).toBe(0);
  });

  it('ignores a known order that is older than the visit window', () => {
    const settled = [{ id: 'old', session_id: 's-1', created_at: at(3 * 60), grand_total: 210 }];
    expect(ownVisitOrders(settled, 'old', NOW).own).toBeNull();
  });
});

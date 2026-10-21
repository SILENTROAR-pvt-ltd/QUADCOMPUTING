import { describe, it, expect } from 'vitest';
import { belongsToStay, mergeBillLines, stayStartMs } from './stay-scope';

describe('which orders belong to the guest in the room', () => {
  const now = Date.parse('2026-10-21T12:00:00Z');
  const room = { check_in_time: '2026-10-21T08:00:00Z' };

  it('leaves out an earlier stay\'s leftovers and keeps this stay\'s orders', () => {
    const start = stayStartMs(room, now);
    expect(belongsToStay({ created_at: '2026-10-20T20:11:00Z' }, start)).toBe(false);
    expect(belongsToStay({ created_at: '2026-10-21T08:30:00Z' }, start)).toBe(true);
    // Created in the minute around check-in (the folio itself, a first dish): still the stay's.
    expect(belongsToStay({ created_at: '2026-10-21T07:59:30Z' }, start)).toBe(true);
  });

  it('treats a check-in time typed ahead as now, so older leftovers stay out', () => {
    const start = stayStartMs({ check_in_time: '2026-10-22T08:00:00Z' }, now);
    expect(start).toBe(now);
    expect(belongsToStay({ created_at: '2026-10-21T09:00:00Z' }, start)).toBe(false);
  });
});

describe('merging repeated dishes on a bill', () => {
  it('adds the quantities of the same dish at the same price, and keeps different ones apart', () => {
    const lines = mergeBillLines([
      { id: 'd1', name: 'Dal', price: 40, qty: 1 }, { id: 'd1', name: 'Dal', price: 40, qty: 2 }, { id: 'd1', name: 'Dal', price: 45, qty: 1 }, { id: 'd2', name: 'Rice', price: 30, qty: 1 },
    ]);
    expect(lines.map((l) => [l.id, l.price, l.qty])).toEqual([['d1', 40, 3], ['d1', 45, 1], ['d2', 30, 1]]);
  });
});

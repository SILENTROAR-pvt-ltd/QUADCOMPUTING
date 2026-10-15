import { describe, it, expect } from 'vitest';
import { isRepeatRing, RING_GAP_MS } from '@/lib/host-alert-sound';
import { callsToRepeat, REPEAT_MS } from './HostAlertSound';
import { arrivedTickets, isStaffAddedTicket } from './usePendingKot';

describe('the order bell', () => {
  it('rings once for one event reported by two screens', () => {
    expect(isRepeatRing(1000 + 200, 1000)).toBe(true);
    expect(isRepeatRing(1000 + RING_GAP_MS, 1000)).toBe(false);
  });

  it('counts only tickets that were not there before', () => {
    expect(arrivedTickets(new Set(['a', 'b']), ['a', 'b', 'c'])).toEqual(['c']);
    expect(arrivedTickets(new Set(['a']), [])).toEqual([]);
  });

  it('does not ring the host for a ticket the waiter keyed in, only for guest orders', () => {
    expect(isStaffAddedTicket({ items: [{ added_by: 'staff' }, { added_by: 'staff' }] })).toBe(true);
    expect(isStaffAddedTicket({ items: [{ added_by: 'staff' }, {}] })).toBe(false);
    expect(isStaffAddedTicket({ items: [{}] })).toBe(false);
    expect(isStaffAddedTicket({ items: [] })).toBe(false);
    expect(isStaffAddedTicket({})).toBe(false);
  });

  it('rings again only for guest calls nobody has answered for a while', () => {
    const now = Date.parse('2026-10-15T10:00:00Z');
    const at = (secondsAgo: number) => new Date(now - secondsAgo * 1000).toISOString();
    const waiting = callsToRepeat([
      { notification_type: 'WAITER', created_at: at(120) },
      { notification_type: 'CHEF', created_at: at(10) },
      { notification_type: 'LOW_STOCK_ALERT', created_at: at(900) },
    ], now);
    expect(waiting).toHaveLength(1);
    expect(waiting[0].notification_type).toBe('WAITER');
    expect(REPEAT_MS).toBeGreaterThanOrEqual(30_000);
  });
});

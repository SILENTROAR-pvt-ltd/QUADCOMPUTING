import { describe, it, expect } from 'vitest';
import { kotTimeline } from '@/lib/utils/kot-timeline';
import type { KitchenTicket } from '@/lib/utils/kitchen';

const T0 = Date.parse('2026-10-08T13:00:00Z');
const at = (min: number) => new Date(T0 + min * 60_000).toISOString();

const ticket = (over: Partial<KitchenTicket>): KitchenTicket => ({
  id: 't1', ticket_number: 'KOT-1', table_or_room: 'T-01', items: [{ name: 'Misal Pav', qty: 1 }],
  status: 'PENDING', created_at: at(0), ...over,
});

describe('Kitchen timeline: when each stage happened', () => {
  it('reads each stage time from the status history', () => {
    const tl = kotTimeline(ticket({
      status: 'SERVED',
      status_history: [
        { from: 'PENDING', to: 'PREPARING', at: at(2) },
        { from: 'PREPARING', to: 'READY', at: at(14) },
        { from: 'READY', to: 'SERVED', at: at(17) },
      ],
    }), T0 + 60 * 60_000);
    expect(tl.stages.map((s) => s.at?.toISOString())).toEqual([at(0), at(2), at(14), at(17)]);
    expect(tl.totalMinutes).toBe(17);
    expect(tl.stageMinutes).toBe(17);
    expect(tl.urgency).toBe('ok');
  });

  it('times the current stage from when it began, not from when the order came in', () => {
    const tl = kotTimeline(ticket({ status: 'PREPARING', status_history: [{ from: 'PENDING', to: 'PREPARING', at: at(10) }] }), T0 + 22 * 60_000);
    expect(tl.stageMinutes).toBe(12);
    expect(tl.totalMinutes).toBe(22);
    expect(tl.stages[2].at).toBeNull();
  });

  it('turns amber and then red when a stage runs long', () => {
    expect(kotTimeline(ticket({ status: 'PENDING' }), T0 + 4 * 60_000).urgency).toBe('ok');
    expect(kotTimeline(ticket({ status: 'PENDING' }), T0 + 6 * 60_000).urgency).toBe('warn');
    expect(kotTimeline(ticket({ status: 'PENDING' }), T0 + 11 * 60_000).urgency).toBe('late');
    const ready = ticket({ status: 'READY', status_history: [{ from: 'PREPARING', to: 'READY', at: at(20) }] });
    expect(kotTimeline(ready, T0 + 31 * 60_000).urgency).toBe('late');
  });

  it('falls back to item times, and to the last update for an old served ticket', () => {
    const old = ticket({
      status: 'SERVED',
      updated_at: at(25),
      items: [{ name: 'Chai', qty: 2, started_at: at(3), ready_at: at(9) }],
    });
    const tl = kotTimeline(old, T0 + 90 * 60_000);
    expect(tl.stages.map((s) => s.at?.toISOString())).toEqual([at(0), at(3), at(9), at(25)]);
    expect(tl.totalMinutes).toBe(25);
  });

  it('copes with a ticket that has no times at all', () => {
    const tl = kotTimeline(ticket({ created_at: 'not a date' }), T0);
    expect(tl.stages.every((s) => s.at === null)).toBe(true);
    expect(tl.stageMinutes).toBe(0);
  });
});

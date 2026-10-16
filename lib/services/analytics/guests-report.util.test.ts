import { describe, expect, it } from 'vitest';
import { guestReport, guestReportFromBills } from './guests-report.util';

const START = '2026-10-10T00:00:00Z';
const v = (order_id: string, guest_key: string, spend: number, visited_at: string) => ({ order_id, guest_key, spend, visited_at });

describe('guestReport (My Guests ledger)', () => {
  const period = [
    v('b1', 'h:@asha', 500, '2026-10-12T10:00:00Z'),
    v('b2', 'p:9876543210', 300, '2026-10-12T11:00:00Z'),
    v('b3', 'p:9876543210', 200, '2026-10-13T11:00:00Z'),
    v('b4', 'n:ravi', 150, '2026-10-14T11:00:00Z'),
    v('b5', 'o:b5', 90, '2026-10-14T12:00:00Z'),
    v('b6', 'o:b6', 60, '2026-10-14T13:00:00Z'),
  ];
  const history = [...period, v('old', 'h:@asha', 400, '2026-09-01T10:00:00Z')];
  const names = [{ guest_key: 'h:@asha', guest_name: 'Asha' }, { guest_key: 'n:ravi', guest_name: 'Ravi' }, { guest_key: 'p:9876543210', guest_name: 'Walk-in guest' }];
  const r = guestReport(period, history, names, START);

  it('counts known guests apart from unnamed walk-ins', () => {
    expect(r).toMatchObject({ source: 'ledger', known: 3, walk_ins: 2 });
  });

  it('calls a guest returning when they came before this period or twice inside it', () => {
    // Asha came in September; the phone guest came twice; Ravi is new.
    expect(r).toMatchObject({ returning: 2, new_guests: 1, returning_rate: 66.7 });
  });

  it('ranks top guests by spend in the period, with a readable name and lifetime visits', () => {
    // Equal spend: the guest with more visits ranks first.
    expect(r.top).toEqual([
      { key: 'p:9876543210', name: 'Guest ·3210', visits: 2, spend: 500, lifetime_visits: 2 },
      { key: 'h:@asha', name: 'Asha · @asha', visits: 1, spend: 500, lifetime_visits: 2 },
      { key: 'n:ravi', name: 'Ravi', visits: 1, spend: 150, lifetime_visits: 1 },
    ]);
  });

  it('reports nothing, without dividing by zero, for a period with only walk-ins', () => {
    expect(guestReport([v('b1', 'o:b1', 50, '2026-10-12T10:00:00Z')], [], [], START)).toMatchObject({ known: 0, walk_ins: 1, returning_rate: null, top: [] });
  });
});

describe('guestReportFromBills (fallback)', () => {
  it('uses the bills alone: returning means two or more bills in the period', () => {
    const r = guestReportFromBills([
      { id: 'a', key: 'p:1', spend: 100, created_at: START }, { id: 'b', key: 'p:1', spend: 50, created_at: START },
      { id: 'c', key: 'n:x', spend: 70, created_at: START }, { id: 'd', key: null, spend: 30, created_at: START },
    ]);
    expect(r).toMatchObject({ source: 'bills', known: 2, walk_ins: 1, returning: 1, new_guests: 1 });
  });
});

import { describe, it, expect } from 'vitest';
import { reservationSummary } from './reservation-summary.service';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER = 'cccccccc-1111-4222-8333-444444444444';

// A head-only count double: counts the seeded rows that match the filters the service applies.
function countingDb(tables: Record<string, any[]>, missing: string[] = []) {
  return {
    from(table: string) {
      const filters: Array<(r: any) => boolean> = [];
      const q: any = {
        select: () => q,
        eq: (c: string, v: any) => { filters.push((r) => r[c] === v); return q; },
        gt: (c: string, v: any) => { filters.push((r) => r[c] > v); return q; },
        then: (ok: any, fail: any) => Promise.resolve(missing.includes(table)
          ? { count: null, error: { code: '42P01', message: 'relation does not exist' } }
          : { count: (tables[table] || []).filter((r) => filters.every((f) => f(r))).length, error: null }).then(ok, fail),
      };
      return q;
    },
  };
}

describe('the Reservations light', () => {
  const db = countingDb({
    venue_reservations: [
      { business_id: BIZ, status: 'requested', created_at: '2026-10-22T10:00:00Z' },
      { business_id: BIZ, status: 'confirmed', created_at: '2026-10-22T12:00:00Z' },
      { business_id: OTHER, status: 'requested', created_at: '2026-10-22T12:00:00Z' },
    ],
    stay_booking_requests: [{ business_id: BIZ, status: 'requested', created_at: '2026-10-22T13:00:00Z' }],
    event_guest_leads: [{ business_id: BIZ, status: 'INTERESTED', created_at: '2026-10-22T09:00:00Z' }],
    venue_offer_requests: [{ venue_id: BIZ, status: 'open', created_at: '2026-10-22T14:00:00Z' }],
  });

  it('counts what waits and what is new since the host last looked, for this venue only', async () => {
    const s = await reservationSummary(db, BIZ, '2026-10-22T11:00:00Z');
    expect(s.tables).toEqual({ waiting: 1, fresh: 1 });
    expect(s.rooms).toEqual({ waiting: 1, fresh: 1 });
    expect(s.events).toEqual({ waiting: 1, fresh: 0 });
    expect(s.offers).toEqual({ waiting: 1, fresh: 1 });
    expect(s).toMatchObject({ waiting: 4, unread: 3 });
  });

  it('counts nothing as new before the host has ever looked, and a missing table as zero', async () => {
    const s = await reservationSummary(countingDb({}, ['event_guest_leads']), BIZ, null);
    expect(s).toMatchObject({ waiting: 0, unread: 0, events: { waiting: 0, fresh: 0 } });
  });
});

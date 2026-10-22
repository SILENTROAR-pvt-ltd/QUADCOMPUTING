import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { myEventStatuses, readLeadIds } from './my-event-status';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER = 'cccccccc-1111-4222-8333-444444444444';
const L1 = '11111111-1111-4111-8111-111111111111';
const L2 = '22222222-2222-4222-8222-222222222222';
const L3 = '33333333-3333-4333-8333-333333333333';

const db = () => createFakeSupabase({
  event_guest_leads: [
    { id: L1, business_id: BIZ, event_id: 'ev-a', guest_key: 'phone:999', status: 'CONFIRMED', party_size: 5, updated_at: '2026-10-22T13:00:00Z' },
    { id: L2, business_id: BIZ, event_id: 'ev-b', guest_key: 'handle:@asha', status: 'INTERESTED', party_size: 2, updated_at: null, created_at: '2026-10-22T12:00:00Z' },
    { id: L3, business_id: OTHER, event_id: 'ev-c', guest_key: 'handle:@asha', status: 'CONFIRMED', party_size: 2, updated_at: '2026-10-22T12:00:00Z' },
  ],
});

describe("a guest's own event requests", () => {
  it('keeps only real request ids, at most 30', () => {
    expect(readLeadIds(`${L1}, nope ,${L1},${L2}`)).toEqual([L1, L2]);
    expect(readLeadIds(null)).toEqual([]);
  });

  it("shows the venue's answer for the requests this phone sent", async () => {
    const s = await myEventStatuses(db(), BIZ, [L1], null);
    expect(s).toEqual({ 'ev-a': { lead_id: L1, status: 'CONFIRMED', party_size: 5, updated_at: '2026-10-22T13:00:00Z' } });
  });

  it("finds a signed-in guest's requests by their own key, at this venue only", async () => {
    const s = await myEventStatuses(db(), BIZ, [], 'handle:@asha');
    expect(Object.keys(s)).toEqual(['ev-b']);
    expect(s['ev-b'].status).toBe('INTERESTED');
  });

  it("never shows another venue's request, even by its id", async () => {
    expect(await myEventStatuses(db(), BIZ, [L3], null)).toEqual({});
  });
});

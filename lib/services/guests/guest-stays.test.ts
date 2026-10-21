import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { attachGuestStays, staysByPhone } from './guest-stays';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';

describe('a guest\'s stays beside their visits', () => {
  it('counts stays and nights per phone, under any spelling of the number', () => {
    const by = staysByPhone([
      { guest_phone: '+91 98765 43210', check_in_time: '2026-10-01T08:00:00Z', check_out_time: '2026-10-03T05:00:00Z' },
      { guest_phone: '9876543210', check_in_time: '2026-10-20T08:00:00Z', check_out_time: '2026-10-21T05:00:00Z' },
      { guest_phone: null, check_in_time: '2026-10-20T08:00:00Z', check_out_time: null },
    ]);
    expect(by.get('9876543210')).toEqual({ stays: 2, nights: 3, last_stay_at: '2026-10-20T08:00:00Z' });
    expect(by.size).toBe(1);
  });

  it('attaches them to the ledger rows by phone, and gives a guest with no stays zeros', async () => {
    const db = createFakeSupabase({ room_stay_logs: [{ business_id: BIZ, guest_phone: '9876543210', check_in_time: '2026-10-01T08:00:00Z', check_out_time: '2026-10-03T05:00:00Z' }] });
    const rows = await attachGuestStays(db, BIZ, [{ phone: '+919876543210', visits: 3 }, { phone: null, visits: 1 }]);
    expect(rows[0]).toMatchObject({ visits: 3, stays: 1, nights: 2 });
    expect(rows[1]).toMatchObject({ visits: 1, stays: 0, nights: 0 });
  });
});

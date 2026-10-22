import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { buildTableOrFilter } from '@/lib/services/guest-order/order-utils';
import { clearBillCalls, ringBillRequest } from './bill-call';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER = 'cccccccc-1111-4222-8333-444444444444';

describe('the bill call', () => {
  it('rings once per table within the window and says which table asked', async () => {
    const db = createFakeSupabase({ staff_notifications: [] });
    const t0 = Date.now();
    expect(await ringBillRequest(db, BIZ, 'T-01', t0)).toBe(true);
    expect(await ringBillRequest(db, BIZ, 'T-01', t0 + 3000)).toBe(true);
    expect(await ringBillRequest(db, BIZ, 'T-02', t0 + 3000)).toBe(true);
    expect(db.tables.staff_notifications.map((n) => n.table_number)).toEqual(['T-01', 'T-02']);
    expect(db.tables.staff_notifications[0]).toMatchObject({ business_id: BIZ, notification_type: 'BILL', status: 'PENDING', message: null });
    expect(await ringBillRequest(db, BIZ, '', t0)).toBe(false);
  });

  it('is cleared for that table only, at that venue only, and leaves other calls waiting', async () => {
    const db = createFakeSupabase({
      staff_notifications: [
        { id: 'a', business_id: BIZ, table_number: 'T-01', notification_type: 'BILL', status: 'PENDING' },
        { id: 'b', business_id: BIZ, table_number: 'T-02', notification_type: 'BILL', status: 'PENDING' },
        { id: 'c', business_id: BIZ, table_number: 'T-01', notification_type: 'WAITER', status: 'PENDING' },
        { id: 'd', business_id: OTHER, table_number: 'T-01', notification_type: 'BILL', status: 'PENDING' },
      ],
    });
    await clearBillCalls(db, BIZ, buildTableOrFilter('T-01'));
    const status = Object.fromEntries(db.tables.staff_notifications.map((n) => [n.id, n.status]));
    expect(status).toEqual({ a: 'RESOLVED', b: 'PENDING', c: 'PENDING', d: 'PENDING' });
  });
});

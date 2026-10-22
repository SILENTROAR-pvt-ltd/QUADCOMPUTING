import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { updateGuestSession } from './update-session.service';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const SESSION = 'dddddddd-1111-4222-8333-444444444444';
const ORDER = 'bbbbbbbb-1111-4222-8333-444444444444';

const db = () => createFakeSupabase({
  dine_in_sessions: [{ id: SESSION, business_id: BIZ, table_number: 'T-01', status: 'open', updated_at: '2026-10-22T10:00:00.000Z' }],
  orders: [{ id: ORDER, business_id: BIZ, session_id: SESSION, table_number: 'T-01', status: 'open', grand_total: 640 }],
  order_items: [{ id: 'i1', order_id: ORDER }, { id: 'i2', order_id: ORDER }],
  bill_request_events: [],
  staff_notifications: [],
});
const request = (over: Record<string, unknown> = {}) => ({ session_id: SESSION, table_number: 'T-01', business_id: BIZ, action: 'request_bill', ...over });

describe('a guest asking for the bill', () => {
  it("marks the table's session, records the request and rings the host with a BILL call", async () => {
    const fake = db();
    const result = await updateGuestSession(request(), fake);
    expect(result.success).toBe(true);
    expect(fake.tables.dine_in_sessions[0].status).toBe('bill_requested');
    expect(fake.tables.bill_request_events).toHaveLength(1);
    expect(fake.tables.bill_request_events[0]).toMatchObject({ business_id: BIZ, table_number: 'T-01', running_total: 640 });
    expect(fake.tables.staff_notifications).toHaveLength(1);
    expect(fake.tables.staff_notifications[0]).toMatchObject({ business_id: BIZ, table_number: 'T-01', notification_type: 'BILL', status: 'PENDING' });
  });

  it('a second tap rings once', async () => {
    const fake = db();
    await updateGuestSession(request(), fake);
    await updateGuestSession(request(), fake);
    expect(fake.tables.staff_notifications).toHaveLength(1);
  });

  it('refuses anything but a bill request, and a table with nothing to bill', async () => {
    await expect(updateGuestSession(request({ action: 'close', status: 'closed' }), db())).rejects.toThrow(/only request the bill/);
    const empty = createFakeSupabase({ dine_in_sessions: [], orders: [], bill_request_events: [], staff_notifications: [] });
    await expect(updateGuestSession(request({ session_id: undefined, table_number: 'T-09' }), empty)).rejects.toThrow(/no open bill/);
    expect(empty.tables.staff_notifications).toHaveLength(0);
  });
});

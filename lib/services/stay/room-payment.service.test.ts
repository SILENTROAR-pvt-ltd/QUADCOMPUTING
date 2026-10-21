import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { quoteRoomPayment, recordRoomPayment } from './room-payment.service';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const ROOM = 'dddddddd-1111-4222-8333-444444444441';
const room = (extra: Record<string, unknown> = {}) => ({
  id: ROOM, business_id: BIZ, room_number: '204', status: 'OCCUPIED', guest_name: 'Asha Rao', guest_phone: '9876543210',
  check_in_time: '2026-10-21T09:00:00.000Z', advance_paid: 0, stay_extras: [], selected_addons: [], category: { id: 'cat', name: 'Mount View', price: 3500 }, ...extra,
});
const food = { id: 'o1', business_id: BIZ, room_id: ROOM, order_type: 'room_service', status: 'open', grand_total: 660, items: [{ name: 'Pav Bhaji', qty: 3, price: 220 }], created_at: '2026-10-21T12:00:00.000Z' };

describe('a payment taken during the stay', () => {
  it('quotes the balance, records it as a settled bill, raises the advance, and clears a "pay now" request', async () => {
    const db = createFakeSupabase({ rooms: [room({ checkout_request: { kind: 'bill', status: 'pending', requested_at: 'x', note: null } })], orders: [food] });
    const q = await quoteRoomPayment(db, BIZ, ROOM);
    expect(q.amount).toBe(4160);
    expect(q.lines.map((l) => l.id)).toContain('dining');

    const r = await recordRoomPayment(db, BIZ, ROOM, { paymentMethod: 'UPI', paymentReference: '412345678901', purpose: 'balance' });
    expect(r).toMatchObject({ amount: 4160, tender: 'UPI', paidSoFar: 4160, balance: 0 });
    const bill = db.tables.orders.find((o: any) => o.id === r.billId);
    expect(bill).toMatchObject({ order_type: 'room_advance', status: 'SETTLED', grand_total: 4160, payment_method: 'UPI', room_id: ROOM });
    expect(db.tables.rooms[0]).toMatchObject({ advance_paid: 4160, checkout_request: null });
    // Nothing left: the guest's bill now shows paid, and a second payment is refused.
    expect((await quoteRoomPayment(db, BIZ, ROOM)).amount).toBe(0);
    await expect(recordRoomPayment(db, BIZ, ROOM, { paymentMethod: 'CASH' })).rejects.toMatchObject({ code: 'INVALID' });
  });

  it('takes a part payment, never more than is owed, and keeps a check-out request that is not about paying', async () => {
    const db = createFakeSupabase({ rooms: [room({ checkout_request: { kind: 'checkout', status: 'pending', requested_at: 'x', note: null } })], orders: [] });
    const r = await recordRoomPayment(db, BIZ, ROOM, { amount: 1000, paymentMethod: 'CASH', purpose: 'stay' });
    expect(r).toMatchObject({ amount: 1000, paidSoFar: 1000, balance: 2500 });
    expect(db.tables.rooms[0].checkout_request).toMatchObject({ kind: 'checkout' });
    await expect(recordRoomPayment(db, BIZ, ROOM, { amount: 9000, paymentMethod: 'CASH' })).rejects.toMatchObject({ code: 'INVALID' });
    await expect(recordRoomPayment(db, BIZ, ROOM, { amount: 100, paymentMethod: 'UPI', paymentReference: '' })).rejects.toMatchObject({ code: 'INVALID' });
  });

  it('refuses a room with no guest in it', async () => {
    const db = createFakeSupabase({ rooms: [room({ status: 'VACANT' })], orders: [] });
    await expect(quoteRoomPayment(db, BIZ, ROOM)).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});

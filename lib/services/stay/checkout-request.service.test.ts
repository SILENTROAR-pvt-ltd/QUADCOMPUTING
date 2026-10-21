import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { checkoutRequestView, dismissCheckoutRequest, requestRoomCheckout } from './checkout-request.service';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const ROOM = 'dddddddd-1111-4222-8333-444444444441';
const NOW = new Date('2026-10-21T15:30:00.000Z');

const room = (extra: Record<string, unknown> = {}) => ({ id: ROOM, business_id: BIZ, room_number: '204', status: 'OCCUPIED', guest_name: 'Asha', ...extra });
const makeDb = (r = room()) => createFakeSupabase({ rooms: [r], staff_notifications: [], businesses: [{ id: BIZ }] });

describe('the guest asks to check out from the room page', () => {
  it('records the request on the room and rings the desk once', async () => {
    const db = makeDb();
    const first = await requestRoomCheckout(db, { room: room(), business: { id: BIZ } }, 'request', 'Taxi at 11 please', NOW);
    expect(first).toMatchObject({ ok: true, request: { kind: 'checkout', status: 'pending', requested_at: NOW.toISOString(), note: 'Taxi at 11 please' } });
    const { data: saved } = await db.from('rooms').select('checkout_request').eq('id', ROOM).maybeSingle();
    expect(saved.checkout_request).toMatchObject({ status: 'pending', note: 'Taxi at 11 please' });
    const { data: calls } = await db.from('staff_notifications').select('*');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ business_id: BIZ, table_number: 'ROOM 204', notification_type: 'BILL', status: 'PENDING' });
    expect(calls[0].message).toContain('Room 204');

    // A second tap while the first waits is one request, not two bells.
    const again = await requestRoomCheckout(db, { room: saved ? { ...room(), ...saved } : room(), business: { id: BIZ } }, 'request', undefined, NOW);
    expect(again).toMatchObject({ ok: true, duplicate: true });
    expect((await db.from('staff_notifications').select('*')).data).toHaveLength(1);
  });

  it('never lands on a room that is no longer occupied', async () => {
    const db = makeDb(room({ status: 'VACANT' }));
    const res = await requestRoomCheckout(db, { room: room({ status: 'VACANT' }), business: { id: BIZ } }, 'request', undefined, NOW);
    expect(res).toMatchObject({ ok: false, code: 'NO_STAY' });
  });

  it('is taken back by the guest, or cleared by the desk', async () => {
    const pending = room({ checkout_request: { status: 'pending', requested_at: NOW.toISOString(), note: null } });
    const db = makeDb(pending);
    expect(checkoutRequestView(pending)).toEqual({ kind: 'checkout', status: 'pending', requested_at: NOW.toISOString(), note: null });
    // Asking to pay now replaces a check-out request, and reads as its own kind.
    const pay = await requestRoomCheckout(db, { room: pending, business: { id: BIZ } }, 'request', 'UPI please', NOW, 'bill');
    expect(pay).toMatchObject({ ok: true, request: { kind: 'bill', note: 'UPI please' } });
    expect(db.tables.staff_notifications.at(-1)?.message).toContain('pay the running bill');

    const back = await requestRoomCheckout(db, { room: pending, business: { id: BIZ } }, 'cancel', undefined, NOW);
    expect(back).toEqual({ ok: true, request: null });
    expect((await db.from('rooms').select('checkout_request').eq('id', ROOM).maybeSingle()).data.checkout_request).toBeNull();

    await requestRoomCheckout(db, { room: room(), business: { id: BIZ } }, 'request', undefined, NOW);
    expect(await dismissCheckoutRequest(db, BIZ, ROOM)).toBe(true);
    expect((await db.from('rooms').select('checkout_request').eq('id', ROOM).maybeSingle()).data.checkout_request).toBeNull();
    expect(checkoutRequestView({ checkout_request: null })).toBeNull();
  });
});

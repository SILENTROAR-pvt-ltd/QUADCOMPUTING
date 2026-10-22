import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { reservationMessage, ringNewReservation } from './booking-alert.service';
import { roomRequests, roomCallLabel } from './room-requests.service';
import { alertTarget, alertCountsByTab } from '@/lib/host/alert-routing';
import { callsToRepeat, RINGING_TYPES } from '@/components/host/control-center/HostAlertSound';
import { roomUpdates } from '@/components/room/room-updates';
import type { RoomState } from '@/components/room/useRoomStay';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER = 'cccccccc-1111-4222-8333-444444444444';
const reservation = { code: 'ST-AB12CD', guestName: 'Asha Rao', roomType: 'Deluxe', checkIn: '2026-10-23', checkOut: '2026-10-25', nights: 2, guests: 2 };

describe('a guest reserving a room rings the desk', () => {
  it('says who (first name only), which room, when and the code', () => {
    expect(reservationMessage(reservation)).toBe('Asha · Deluxe · 23 Oct → 25 Oct (2 nights, 2 guests) · ST-AB12CD');
  });

  it('stores one pending STAY_BOOKING call for this venue, which rings once and opens the bookings list', async () => {
    const db = createFakeSupabase({ staff_notifications: [] });
    expect(await ringNewReservation(db, BIZ, reservation)).toBe(true);
    const call = db.tables.staff_notifications[0] as { notification_type: string; table_number: string | null };
    expect(call).toMatchObject({ business_id: BIZ, notification_type: 'STAY_BOOKING', status: 'PENDING', table_number: null });
    expect(alertTarget(call)).toEqual({ tab: 'accommodations', place: 'Rooms', view: 'bookings' });
    expect(alertCountsByTab([call])).toEqual({ accommodations: 1 });
    expect(RINGING_TYPES.has('STAY_BOOKING')).toBe(true);
    // A reservation rings once; only a guest waiting on someone rings again every minute.
    const old = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(callsToRepeat([{ notification_type: 'STAY_BOOKING', created_at: old }, { notification_type: 'SERVICE', created_at: old }], Date.now()).map((c) => c.notification_type)).toEqual(['SERVICE']);
  });
});

describe("the stay's requests (the folio's history and the guest's list)", () => {
  const room = { room_number: '204', check_in_time: '2026-10-22T08:00:00.000Z' };
  const call = (id: string, at: string, extra: Record<string, unknown> = {}) => ({
    id, business_id: BIZ, table_number: roomCallLabel('204'), notification_type: 'SERVICE', message: `msg ${id}`, status: 'PENDING', created_at: at, ...extra,
  });

  it('lists this stay only, newest first, waiting or done, never another room or venue', async () => {
    const db = createFakeSupabase({
      staff_notifications: [
        call('before', '2026-10-21T20:00:00.000Z'),
        call('towels', '2026-10-22T09:00:00.000Z', { status: 'RESOLVED' }),
        call('pay', '2026-10-22T11:00:00.000Z', { notification_type: 'BILL' }),
        call('room305', '2026-10-22T10:00:00.000Z', { table_number: 'ROOM 305' }),
        call('elsewhere', '2026-10-22T10:30:00.000Z', { business_id: OTHER }),
      ],
    });
    const list = await roomRequests(db, BIZ, room);
    expect(list.map((r) => r.id)).toEqual(['pay', 'towels']);
    expect(list[0]).toMatchObject({ kind: 'bill', status: 'waiting' });
    expect(list[1]).toMatchObject({ kind: 'service', status: 'done', message: 'msg towels' });
  });

  it('has nothing for a room without a number', async () => {
    expect(await roomRequests(createFakeSupabase({ staff_notifications: [] }), BIZ, { room_number: null })).toEqual([]);
  });
});

describe('the guest hears what the desk did', () => {
  const state = (over: Partial<RoomState>): RoomState => ({
    room: { id: 'r1', room_number: '204' } as RoomState['room'], business: {} as RoomState['business'], occupied: true, verified: true,
    dining: {} as RoomState['dining'], folio: { advance_paid: 0 } as RoomState['folio'], invoice: null, late_checkout: null, checkout_request: null, requests: [], ...over,
  });

  it('reports a request marked done, a late check-out decided and a payment recorded, once each', () => {
    const before = state({
      requests: [{ id: 'a', kind: 'service', message: 'Extra towels, please', status: 'waiting', at: '' }],
      late_checkout: { current: '11:00', options: [], request: { status: 'pending', label: '2 PM', fee: 500 }, available: true },
    });
    const after = state({
      requests: [{ id: 'a', kind: 'service', message: 'Extra towels, please', status: 'done', at: '' }],
      late_checkout: { current: '14:00', options: [], request: null, available: true },
      folio: { advance_paid: 2500 } as RoomState['folio'],
    });
    expect(roomUpdates(before, after).map((u) => u.title)).toEqual(['Request done', 'Late check-out confirmed', 'Payment received']);
    expect(roomUpdates(after, after)).toEqual([]);
  });

  it('says nothing on the first read, for another room, or before the guest has confirmed the room', () => {
    const s = state({});
    expect(roomUpdates(null, s)).toEqual([]);
    expect(roomUpdates(state({ room: { id: 'r2', room_number: '305' } as RoomState['room'] }), s)).toEqual([]);
    expect(roomUpdates(state({ verified: false }), s)).toEqual([]);
  });

  it('tells the guest when a late check-out is declined', () => {
    const before = state({ late_checkout: { current: '11:00', options: [], request: { status: 'pending', label: '2 PM', fee: 500 }, available: true } });
    const after = state({ late_checkout: { current: '11:00', options: [], request: { status: 'declined', label: '2 PM', fee: 500 }, available: true } });
    expect(roomUpdates(before, after).map((u) => u.title)).toEqual(['Late check-out not possible']);
  });
});

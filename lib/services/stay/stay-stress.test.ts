import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { createStayBooking, StayBookingError } from './stay-booking.service';
import { selfCheckIn } from './self-checkin.service';
import { claimPass, StayPassError } from './stay-pass.service';
import { grantLateCheckout } from './late-checkout.service';
import { hasRoomSession, issueRoomSession } from './room-session';
import { requestRoomCheckout } from './checkout-request.service';

// The stay under pressure: the same room wanted twice at once, a link used twice, a fee granted twice, a cookie that
// outlives its stay, a request that lands on the wrong guest. Each must fail the right way, every time.

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const CAT = 'cccccccc-1111-4222-8333-444444444444';
const TODAY = '2026-10-21';
const input = (phone: string) => ({ categoryId: CAT, guestName: 'Guest ' + phone.slice(-2), guestPhone: phone, checkIn: '2026-10-25', checkOut: '2026-10-27', guests: 2 });
const room = (n: number, extra: Record<string, unknown> = {}) => ({ id: `room-${n}`, business_id: BIZ, category_id: CAT, room_number: `${100 + n}`, status: 'VACANT', category: { id: CAT, name: 'Mount View', price: 3500 }, ...extra });
const seed = (rooms: any[], bookings: any[] = []) => createFakeSupabase({
  room_categories: [{ id: CAT, business_id: BIZ, name: 'Mount View', price: 3500, occupancy: 2 }],
  rooms, stay_booking_requests: bookings, orders: [], room_stay_logs: [], stay_passes: [], staff_notifications: [],
});

describe('stays under stress', () => {
  beforeEach(() => { vi.stubEnv('STAFF_SESSION_SECRET', 'stress-secret'); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-21T08:00:00Z')); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

  it('gives the last room to exactly one of two guests booking it in the same instant', async () => {
    const db = seed([room(1)]);
    const results = await Promise.allSettled([createStayBooking(db, BIZ, input('9000000001'), TODAY), createStayBooking(db, BIZ, input('9000000002'), TODAY)]);
    const won = results.filter((r) => r.status === 'fulfilled');
    const lost = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(1);
    expect((lost[0].reason as StayBookingError).code).toBe('NO_AVAILABILITY');
    expect(db.tables.stay_booking_requests).toHaveLength(1);
  });

  it('counts a guest still in a room, and refuses the night after the rooms run out, but takes a later, non-overlapping stay', async () => {
    const db = seed([room(1, { status: 'OCCUPIED', check_out_time: '2026-10-26T05:30:00.000Z' }), room(2)]);
    await createStayBooking(db, BIZ, input('9000000001'), TODAY);
    await expect(createStayBooking(db, BIZ, input('9000000002'), TODAY)).rejects.toMatchObject({ code: 'NO_AVAILABILITY' });
    const later = await createStayBooking(db, BIZ, { ...input('9000000003'), checkIn: '2026-10-28', checkOut: '2026-10-29' }, TODAY);
    expect(later.booking.status).toBe('confirmed');
    expect(db.tables.stay_booking_requests).toHaveLength(2);
  });

  it('seats two guests checking themselves in at once in two different rooms, and refuses the third', async () => {
    const db = seed([room(1), room(2)]);
    const guest = (phone: string) => selfCheckIn(db, BIZ, { categoryId: CAT, guestName: 'Guest', guestPhone: phone, idNumber: 'X1', totalGuests: 1 }, { today: TODAY });
    const [a, b] = await Promise.all([guest('9000000001'), guest('9000000002')]);
    expect(new Set([a.room.id, b.room.id]).size).toBe(2);
    await expect(guest('9000000003')).rejects.toMatchObject({ code: 'NO_ROOM' });
  });

  it('lets a check-in link be used once, whatever the second tap does', async () => {
    const db = createFakeSupabase({ stay_passes: [{ id: 'pass-1', status: 'issued' }] });
    await claimPass(db, 'pass-1');
    await expect(claimPass(db, 'pass-1')).rejects.toBeInstanceOf(StayPassError);
    expect(db.tables.stay_passes[0].status).toBe('used');
  });

  it('grants a late check-out once; the second grant for the same day is refused and nothing is charged twice', async () => {
    const policies: any = { early_checkin: [], late_checkout: [{ id: 'late-14', label: 'Until 2 pm', time: '14:00', fee_type: 'flat', value: 500 }] };
    const db = seed([room(1, { status: 'OCCUPIED', guest_name: 'Asha', check_out_time: '2026-10-22T05:30:00.000Z', advance_paid: 0, stay_extras: [] })]);
    const first = await grantLateCheckout(db, BIZ, 'room-1', { optionId: 'late-14', paymentMethod: 'CASH' }, policies);
    expect(first.fee).toBe(500);
    await expect(grantLateCheckout(db, BIZ, 'room-1', { optionId: 'late-14', paymentMethod: 'CASH' }, policies)).rejects.toMatchObject({ code: expect.stringMatching(/CONFLICT|INVALID/) });
    expect(db.tables.orders.filter((o: any) => o.order_type === 'room_advance')).toHaveLength(1);
    expect(db.tables.rooms[0].advance_paid).toBe(500);
  });

  it('stops honouring a room cookie the moment a new stay begins in that room', () => {
    const token = issueRoomSession('room-1', BIZ, '2026-10-21T09:00:00.000Z')!;
    expect(hasRoomSession(token, 'room-1', BIZ, '2026-10-21T09:00:00.000Z')).toBe(true);
    expect(hasRoomSession(token, 'room-1', BIZ, '2026-10-22T09:00:00.000Z')).toBe(false);
    expect(hasRoomSession(token, 'room-2', BIZ, '2026-10-21T09:00:00.000Z')).toBe(false);
    expect(hasRoomSession(token.slice(0, -2) + 'xx', 'room-1', BIZ, '2026-10-21T09:00:00.000Z')).toBe(false);
  });

  it('never writes a check-out request onto a room the guest has already left', async () => {
    const db = seed([room(1, { status: 'CLEANING' })]);
    const r = await requestRoomCheckout(db, { room: db.tables.rooms[0], business: { id: BIZ } }, 'request');
    expect(r).toMatchObject({ ok: false, code: 'NO_STAY' });
    expect(db.tables.rooms[0].checkout_request).toBeUndefined();
  });
});

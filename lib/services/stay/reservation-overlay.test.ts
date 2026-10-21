import { describe, it, expect } from 'vitest';
import { arrivalLabel, assignReservedRooms, isDueNow, upcomingArrivals, type ReservationLite, type RoomLite } from './reservation-overlay';

const TODAY = '2026-10-21';
const room = (id: string, n: string, over: Partial<RoomLite> = {}): RoomLite => ({ id, category_id: 'cat', room_number: n, status: 'VACANT', ...over });
const booking = (id: string, over: Partial<ReservationLite> = {}): ReservationLite => ({
  id, category_id: 'cat', check_in: TODAY, check_out: '2026-10-23', status: 'confirmed', guest_name: id, confirmation_code: `ST-${id}`, guests: 2, ...over,
});

describe('reserved rooms on the front desk', () => {
  it('holds one free room per booking due now, lowest room number first', () => {
    const held = assignReservedRooms([room('r10', '10'), room('r9', '9'), room('r2', '2')], [booking('a')], TODAY);
    expect(Array.from(held.keys())).toEqual(['r2']);
    expect(held.get('r2')?.id).toBe('a');
  });

  it('does not hold a room for a future arrival, a cancelled booking, or a stay that has ended', () => {
    const rooms = [room('r1', '1'), room('r2', '2'), room('r3', '3')];
    const held = assignReservedRooms(rooms, [booking('future', { check_in: '2026-10-25', check_out: '2026-10-27' }), booking('gone', { status: 'cancelled' }), booking('ended', { check_in: '2026-10-19', check_out: '2026-10-21' })], TODAY);
    expect(held.size).toBe(0);
  });

  it('holds only free rooms, and a paid booking gets a room before an unpaid one', () => {
    const rooms = [room('r1', '1', { status: 'OCCUPIED' }), room('r2', '2'), room('r3', '3', { status: 'CLEANING' })];
    const held = assignReservedRooms(rooms, [booking('unpaid'), booking('paid', { pass: { status: 'issued', amount: 7000 } })], TODAY);
    expect(Array.from(held.entries()).map(([r, b]) => [r, b.id])).toEqual([['r2', 'paid']]);
  });

  it('keeps room types apart', () => {
    const rooms = [room('a1', '1', { category_id: 'A' }), room('b1', '2', { category_id: 'B' })];
    const held = assignReservedRooms(rooms, [booking('x', { category_id: 'B' })], TODAY);
    expect(Array.from(held.keys())).toEqual(['b1']);
  });

  it('an overdue arrival (booked yesterday, not here yet) still holds a room', () => {
    expect(isDueNow({ check_in: '2026-10-20', check_out: '2026-10-22', status: 'confirmed' }, TODAY)).toBe(true);
    expect(arrivalLabel('2026-10-20', TODAY)).toBe('Overdue');
  });
});

describe('arrivals strip', () => {
  it('lists the next three days, soonest first, with friendly labels', () => {
    const list = upcomingArrivals([booking('later', { check_in: '2026-10-24', check_out: '2026-10-26' }), booking('tomorrow', { check_in: '2026-10-22', check_out: '2026-10-23' }), booking('today'), booking('far', { check_in: '2026-11-10', check_out: '2026-11-12' })], TODAY, 3);
    expect(list.map((b) => b.id)).toEqual(['today', 'tomorrow', 'later']);
    expect([arrivalLabel(TODAY, TODAY), arrivalLabel('2026-10-22', TODAY)]).toEqual(['Today', 'Tomorrow']);
  });
});

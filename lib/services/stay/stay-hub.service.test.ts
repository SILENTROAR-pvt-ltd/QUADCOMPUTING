import { describe, it, expect } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { stayState, staysForAccount } from './stay-hub.service';
import { findMyRoom, venueStaySummary } from './stay-hub-room.service';
import { issueRoomSession, roomCookieName } from './room-session';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER = 'bbbbbbbb-1111-4222-8333-444444444444';
const CAT = 'cccccccc-1111-4222-8333-444444444444';
const ROOM = 'dddddddd-1111-4222-8333-444444444441';
const TODAY = '2026-10-21';

describe('a guest\'s stays in one place', () => {
  it('reads a reservation\'s state from its status and the calendar', () => {
    expect(stayState({ status: 'confirmed', check_out: '2026-10-25' }, TODAY)).toBe('upcoming');
    expect(stayState({ status: 'confirmed', check_out: '2026-10-20' }, TODAY)).toBe('missed');
    expect(stayState({ status: 'checked_in', check_out: '2026-10-23' }, TODAY)).toBe('in_house');
    expect(stayState({ status: 'checked_in', check_out: '2026-10-21' }, TODAY)).toBe('stayed');
    // Checked out by the desk, even on the day it began: over, whatever the booked dates say.
    expect(stayState({ status: 'checked_out', check_out: '2026-10-22' }, TODAY)).toBe('stayed');
    expect(stayState({ status: 'cancelled', check_out: '2026-10-30' }, TODAY)).toBe('cancelled');
  });

  it('lists the bookings made under the Vibers ID, at one venue or everywhere the same login is connected', async () => {
    const db = createFakeSupabase({
      guest_accounts: [{ id: 'acc-1', business_id: BIZ, user_id: 'user-1' }, { id: 'acc-2', business_id: OTHER, user_id: 'user-1' }, { id: 'acc-x', business_id: OTHER, user_id: 'user-2' }],
      room_categories: [{ id: CAT, business_id: BIZ, name: 'Mount View', price: 3500 }],
      businesses: [{ id: BIZ, business_name: 'Bombay Rasoi', slug: 'bombay-rasoi' }, { id: OTHER, business_name: 'Hill House', slug: 'hill-house' }],
      // The fake returns rows as stored, so the joined room type and venue are seeded in the shape PostgREST returns them.
      stay_booking_requests: [
        { id: 'b1', business_id: BIZ, category_id: CAT, guest_account_id: 'acc-1', confirmation_code: 'ST-AAAAAA', status: 'confirmed', check_in: '2026-10-25', check_out: '2026-10-27', guests: 2, category: { name: 'Mount View' }, business: { id: BIZ, business_name: 'Bombay Rasoi', slug: 'bombay-rasoi' } },
        { id: 'b2', business_id: OTHER, category_id: null, guest_account_id: 'acc-2', confirmation_code: 'ST-BBBBBB', status: 'checked_in', check_in: '2026-10-01', check_out: '2026-10-03', guests: 1, category: null, business: { id: OTHER, business_name: 'Hill House', slug: 'hill-house' } },
        { id: 'b3', business_id: OTHER, category_id: null, guest_account_id: 'acc-x', confirmation_code: 'ST-CCCCCC', status: 'confirmed', check_in: '2026-11-01', check_out: '2026-11-02', guests: 1, category: null, business: { id: OTHER, business_name: 'Hill House', slug: 'hill-house' } },
      ],
    });
    const here = await staysForAccount(db, { id: 'acc-1', user_id: 'user-1' }, { businessId: BIZ }, TODAY);
    expect(here).toHaveLength(1);
    expect(here[0]).toMatchObject({ code: 'ST-AAAAAA', state: 'upcoming', nights: 2, room_type: 'Mount View', venue: { name: 'Bombay Rasoi', slug: 'bombay-rasoi' } });
    const everywhere = await staysForAccount(db, { id: 'acc-1', user_id: 'user-1' }, {}, TODAY);
    expect(everywhere.map((s) => s.code)).toEqual(['ST-AAAAAA', 'ST-BBBBBB']); // never another login's booking
    expect(everywhere[1]).toMatchObject({ state: 'stayed', venue: { name: 'Hill House' } });
    expect(here[0].paid).toBe(false);
    // Once the desk takes the room payment (a live pass), the guest's booking says check-in is open.
    db.tables.stay_passes = [{ id: 'p1', business_id: BIZ, booking_id: 'b1', status: 'issued' }, { id: 'p2', business_id: BIZ, booking_id: 'b3', status: 'void' }];
    const paidNow = await staysForAccount(db, { id: 'acc-1', user_id: 'user-1' }, { businessId: BIZ }, TODAY);
    expect(paidNow[0]).toMatchObject({ code: 'ST-AAAAAA', paid: true });
  });

  it('finds the room this phone is confirmed in, and only while that stay is the current one', async () => {
    const started = '2026-10-21T09:00:00.000Z';
    const db = createFakeSupabase({
      rooms: [{ id: ROOM, business_id: BIZ, category_id: CAT, room_number: '101', status: 'OCCUPIED', check_in_time: started, check_out_date: '2026-10-23', qr_code_hash: 'ROOM_abc', category: { name: 'Mount View' } }],
      room_categories: [{ id: CAT, business_id: BIZ, name: 'Mount View', price: 3500 }],
    });
    const token = issueRoomSession(ROOM, BIZ, started);
    if (!token) return; // no signing secret in this environment: nothing to prove
    const cookie = `${roomCookieName(ROOM)}=${token}; other=1`;
    expect(await findMyRoom(db, BIZ, cookie)).toMatchObject({ code: 'ROOM_abc', room_number: '101', room_type: 'Mount View' });
    expect(await findMyRoom(db, BIZ, 'other=1')).toBeNull();
    // A new stay in the same room: the old phone's session no longer opens it.
    db.tables.rooms[0].check_in_time = '2026-10-24T09:00:00.000Z';
    expect(await findMyRoom(db, BIZ, cookie)).toBeNull();
  });

  it('summarises what the venue offers', async () => {
    const db = createFakeSupabase({
      room_categories: [{ id: CAT, business_id: BIZ, price: 3500 }, { id: 'c2', business_id: BIZ, price: 5200 }],
      rooms: [{ id: 'r1', business_id: BIZ, status: 'VACANT' }, { id: 'r2', business_id: BIZ, status: 'OCCUPIED' }, { id: 'r3', business_id: BIZ, status: 'VACANT' }],
    });
    expect(await venueStaySummary(db, BIZ)).toEqual({ has_rooms: true, from_price: 3500, free_now: 2 });
    expect(await venueStaySummary(db, OTHER)).toEqual({ has_rooms: false, from_price: null, free_now: 0 });
  });
});

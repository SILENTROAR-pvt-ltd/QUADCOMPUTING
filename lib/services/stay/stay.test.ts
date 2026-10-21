import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { availabilityFromRows, nightsOverlap } from './stay-availability.service';
import { createStayBooking, readStayBookingInput, StayBookingError, validateStayBooking } from './stay-booking.service';
import { selfCheckIn, SelfCheckInError } from './self-checkin.service';
import { hasRoomSession, issueRoomSession, roomCookieName, roomSessionFromCookieHeader } from './room-session';
import { diningMessage, diningWindow } from './room-dining-hours';
import { phoneMatches, publicRoom } from './room-access.service';
import { roomDiningLabel } from './room-order.service';
import { isConfirmationCode, newConfirmationCode, normalizeConfirmationCode } from './booking-code';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const CAT = 'cccccccc-1111-4222-8333-444444444444';
const R1 = 'bbbbbbbb-1111-4222-8333-444444444441';
const R2 = 'bbbbbbbb-1111-4222-8333-444444444442';
const TODAY = '2026-10-21';
const booking = (o: Record<string, unknown> = {}) => ({ categoryId: CAT, guestName: 'Asha Rao', guestPhone: '9876543210', checkIn: '2026-10-25', checkOut: '2026-10-27', guests: 2, ...o });

describe('availability for a date range', () => {
  it('counts rooms less overlapping bookings less guests still in house on the first night', () => {
    const rooms = [
      { id: R1, status: 'VACANT' }, { id: R2, status: 'OCCUPIED', check_out_date: '2026-10-26' },
      { id: 'r3', status: 'OCCUPIED', check_out_date: '2026-10-25' }, { id: 'r4', status: 'MAINTENANCE' },
    ];
    const bookings = [{ check_in: '2026-10-26', check_out: '2026-10-28' }, { check_in: '2026-10-10', check_out: '2026-10-25' }];
    const a = availabilityFromRows(rooms, bookings, '2026-10-25', '2026-10-27');
    expect(a).toMatchObject({ total: 3, booked: 1, occupied: 1, available: 1, vacantNow: 1 });
    expect(nightsOverlap('2026-10-25', '2026-10-27', '2026-10-27', '2026-10-29')).toBe(false);
  });
});

describe('advance booking', () => {
  it('validates what the guest typed', () => {
    expect(validateStayBooking(booking(), TODAY)).toBeNull();
    expect(validateStayBooking(booking({ guestPhone: '12345' }), TODAY)).toMatch(/10-digit/);
    expect(validateStayBooking(booking({ checkIn: '2026-10-20' }), TODAY)).toMatch(/past/);
    expect(validateStayBooking(booking({ checkOut: '2026-10-25' }), TODAY)).toMatch(/after check-in/);
    expect(validateStayBooking(booking({ checkOut: '2026-12-25' }), TODAY)).toMatch(/30 nights/);
  });

  it('confirms at once with a code when a room is free, and refuses when the type is full', async () => {
    const db = createFakeSupabase({
      room_categories: [{ id: CAT, business_id: BIZ, name: 'Mount View', price: 3500, occupancy: 2 }],
      rooms: [{ id: R1, business_id: BIZ, category_id: CAT, status: 'VACANT' }],
      stay_booking_requests: [],
    });
    const first = await createStayBooking(db, BIZ, booking(), TODAY);
    expect(first.booking).toMatchObject({ status: 'confirmed', check_in: '2026-10-25', guest_phone: '9876543210' });
    expect(isConfirmationCode(first.code)).toBe(true);
    expect(first.nights).toBe(2);
    await expect(createStayBooking(db, BIZ, booking({ checkIn: '2026-10-26', checkOut: '2026-10-28' }), TODAY))
      .rejects.toMatchObject({ code: 'NO_AVAILABILITY' } satisfies Partial<StayBookingError>);
    // A different venue's category is not offered here.
    await expect(createStayBooking(db, 'ffffffff-1111-4222-8333-444444444444', booking(), TODAY)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('a signed-in guest reserves under their Vibers ID: the account fills the name and mobile and the booking is linked', async () => {
    const account = { id: 'dddddddd-1111-4222-8333-444444444444', display_name: 'Asha Rao', phone: '9876543210' };
    const body = { category_id: CAT, check_in: '2026-10-25', check_out: '2026-10-27', guests: 2 };
    const input = readStayBookingInput(body, account);
    expect(input).toMatchObject({ guestName: 'Asha Rao', guestPhone: '9876543210', guestAccountId: account.id });
    // What they type still wins, and nobody is linked when nobody is signed in.
    expect(readStayBookingInput({ ...body, guest_name: 'A. Rao', guest_phone: '9123456789' }, account)).toMatchObject({ guestName: 'A. Rao', guestPhone: '9123456789' });
    expect(readStayBookingInput(body, null)).toMatchObject({ guestName: '', guestPhone: '', guestAccountId: null });
    expect(validateStayBooking(readStayBookingInput(body, { ...account, phone: null }), TODAY)).toMatch(/10-digit/);

    const db = createFakeSupabase({
      room_categories: [{ id: CAT, business_id: BIZ, name: 'Mount View', price: 3500, occupancy: 2 }],
      rooms: [{ id: R1, business_id: BIZ, category_id: CAT, status: 'VACANT' }],
      stay_booking_requests: [],
    });
    const made = await createStayBooking(db, BIZ, input, TODAY);
    expect(made.booking).toMatchObject({ guest_account_id: account.id, guest_name: 'Asha Rao', guest_phone: '9876543210' });
    const anonymous = await createStayBooking(db, BIZ, booking({ checkIn: '2026-11-01', checkOut: '2026-11-02' }), TODAY);
    expect(anonymous.booking.guest_account_id).toBeNull();
  });

  it('codes are readable and normalise from what a guest types', () => {
    expect(newConfirmationCode()).toMatch(/^ST-[A-HJ-NP-Z2-9]{6}$/);
    expect(normalizeConfirmationCode(' st-abc234 ')).toBe('ST-ABC234');
    expect(normalizeConfirmationCode('ST-ABC2O4')).toBeNull(); // O and 0 are never issued
  });
});

describe('self check-in', () => {
  const vacant = (id: string, n: string) => ({ id, business_id: BIZ, category_id: CAT, room_number: n, status: 'VACANT', selected_addons: [], category: { id: CAT, name: 'Mount View', price: 3500 } });
  const guest = { guestName: 'Asha Rao', guestPhone: '9876543210', idProofPath: `${BIZ}/dddddddd-1111-4222-8333-444444444444.jpg`, totalGuests: 2, checkOut: '2026-10-23', categoryId: CAT };

  it('takes the first vacant room of the type, opens the folio and marks the stay as a self check-in', async () => {
    const db = createFakeSupabase({ rooms: [vacant(R2, '102'), vacant(R1, '101')], orders: [], room_stay_logs: [], stay_booking_requests: [] });
    const r = await selfCheckIn(db, BIZ, guest, { today: TODAY, checkoutTime: '11:00', now: new Date('2026-10-21T09:00:00Z') });
    expect(r.room).toMatchObject({ id: R1, status: 'OCCUPIED', guest_name: 'Asha Rao', checkin_source: 'self', id_proof_path: guest.idProofPath });
    expect(r.room.check_out_time).toBe('2026-10-23T05:30:00.000Z');
    expect(db.tables.orders.find((o: any) => o.order_type === 'room_stay')).toMatchObject({ status: 'active', grand_total: 7000, table_number: 'ROOM 101' });
    expect(db.tables.room_stay_logs[0]).toMatchObject({ checkin_source: 'self', id_proof_path: guest.idProofPath });
    expect(db.tables.rooms.find((x: any) => x.id === R2)?.status).toBe('VACANT');
  });

  it('refuses without an ID, with a foreign upload path, or when no room is free', async () => {
    const db = createFakeSupabase({ rooms: [{ ...vacant(R1, '101'), status: 'OCCUPIED' }], orders: [], room_stay_logs: [] });
    await expect(selfCheckIn(db, BIZ, { ...guest, idProofPath: null }, { today: TODAY })).rejects.toMatchObject({ code: 'INVALID' } satisfies Partial<SelfCheckInError>);
    await expect(selfCheckIn(db, BIZ, { ...guest, idProofPath: '../etc/passwd' }, { today: TODAY })).rejects.toMatchObject({ code: 'INVALID' });
    await expect(selfCheckIn(db, BIZ, guest, { today: TODAY })).rejects.toMatchObject({ code: 'NO_ROOM' });
  });

  it('enforces DPDP Act 2023 consent and Saraai Act Form C foreign national compliance', async () => {
    const db = createFakeSupabase({ rooms: [vacant(R1, '101')], orders: [], room_stay_logs: [] });
    // Rejects when DPDP consent is explicitly declined
    await expect(selfCheckIn(db, BIZ, { ...guest, dpdpConsentAccepted: false }, { today: TODAY }))
      .rejects.toMatchObject({ code: 'INVALID', message: expect.stringMatching(/DPDP/) });

    // Rejects foreign national check-in without passport or country of origin
    await expect(selfCheckIn(db, BIZ, { ...guest, isForeignNational: true, passportNumber: null }, { today: TODAY }))
      .rejects.toMatchObject({ code: 'INVALID', message: expect.stringMatching(/Passport/) });
    await expect(selfCheckIn(db, BIZ, { ...guest, isForeignNational: true, passportNumber: 'P1234567', countryOfOrigin: null }, { today: TODAY }))
      .rejects.toMatchObject({ code: 'INVALID', message: expect.stringMatching(/Country of Origin/) });

    // Accepts foreign national with full Form C details
    const r = await selfCheckIn(db, BIZ, {
      ...guest,
      dpdpConsentAccepted: true,
      isForeignNational: true,
      passportNumber: 'Z9876543',
      visaNumber: 'V112233',
      countryOfOrigin: 'United Kingdom',
      visaExpiryDate: '2027-01-01',
    }, { today: TODAY });
    expect(r.room).toMatchObject({
      is_foreign_national: true,
      passport_number: 'Z9876543',
      visa_number: 'V112233',
      country_of_origin: 'United Kingdom',
      dpdp_consent_accepted: true,
    });
  });

  it('turns a booking code into the stay', async () => {
    const db = createFakeSupabase({
      rooms: [vacant(R1, '101')], orders: [], room_stay_logs: [],
      stay_booking_requests: [{ id: 'bk1', business_id: BIZ, category_id: CAT, confirmation_code: 'ST-ABC234', status: 'confirmed', check_out: '2026-10-24' }],
    });
    const r = await selfCheckIn(db, BIZ, { ...guest, categoryId: null, checkOut: null, bookingCode: 'st-abc234' }, { today: TODAY });
    expect(r.room).toMatchObject({ checkin_source: 'booking' });
    expect(db.tables.stay_booking_requests[0]).toMatchObject({ status: 'checked_in', room_id: R1 });
  });
});

describe('room session and verification', () => {
  let saved: string | undefined;
  beforeEach(() => { saved = process.env.STAFF_SESSION_SECRET; process.env.STAFF_SESSION_SECRET = 'test-secret-stays'; });
  afterEach(() => { if (saved === undefined) delete process.env.STAFF_SESSION_SECRET; else process.env.STAFF_SESSION_SECRET = saved; });

  it('is bound to the room, the venue and the stay', () => {
    const token = issueRoomSession(R1, BIZ, '2026-10-21T09:00:00Z')!;
    expect(hasRoomSession(token, R1, BIZ, '2026-10-21T09:00:00Z')).toBe(true);
    expect(hasRoomSession(token, R2, BIZ, '2026-10-21T09:00:00Z')).toBe(false);
    expect(hasRoomSession(token, R1, BIZ, '2026-10-22T09:00:00Z')).toBe(false); // a new stay in the same room
    expect(hasRoomSession(`${token}x`, R1, BIZ, '2026-10-21T09:00:00Z')).toBe(false);
    expect(roomSessionFromCookieHeader(`a=1; ${roomCookieName(R1)}=${token}`, R1)).toBe(token);
  });

  it('matches the last four digits of the phone and nothing else', () => {
    expect(phoneMatches({ guest_phone: '+91 98765 43210' }, '3210')).toBe(true);
    expect(phoneMatches({ guest_phone: '9876543210' }, '0000')).toBe(false);
    expect(phoneMatches({ guest_phone: null }, '3210')).toBe(false);
  });

  it('never shows the page the phone, the ID or the address', () => {
    const room = { id: R1, room_number: '101', status: 'OCCUPIED', guest_name: 'Asha Rao', guest_phone: '9876543210', id_number: 'X1', guest_address: 'Somewhere', check_in_time: '2026-10-21T08:00:00Z', total_guests: 2, category: { name: 'Mount View', price: 3500 } };
    const view = publicRoom(room, true);
    expect(view).toMatchObject({ room_number: '101', guest_first_name: 'Asha', total_guests: 2 });
    expect(JSON.stringify(view)).not.toMatch(/9876543210|X1|Somewhere/);
    // Before the last-4 check, a scanned card tells nothing about who is staying.
    expect(publicRoom(room)).toMatchObject({ room_number: '101', guest_first_name: null, check_in_time: null, total_guests: 1 });
  });
});

describe('in-room dining hours and labels', () => {
  const rows = [{ weekday: 3, open_time: '07:30:00', close_time: '22:30:00', is_closed: false }]; // 2026-10-21 is a Wednesday
  it('opens and closes by the venue hours in India time, and is open with no hours saved', () => {
    expect(diningWindow(rows, new Date('2026-10-21T01:00:00Z'))).toMatchObject({ open: false, reason: 'before_open', opensAt: '07:30' }); // 06:30 IST
    expect(diningWindow(rows, new Date('2026-10-21T07:00:00Z')).open).toBe(true); // 12:30 IST
    expect(diningWindow(rows, new Date('2026-10-21T17:30:00Z'))).toMatchObject({ open: false, reason: 'after_close' }); // 23:00 IST
    expect(diningWindow([], new Date())).toMatchObject({ open: true, reason: 'no_hours' });
    expect(diningMessage(diningWindow(rows, new Date('2026-10-21T01:00:00Z')))).toBe('Kitchen opens at 7:30 am');
  });

  it('labels a room order so it never joins the stay folio', () => {
    expect(roomDiningLabel('101')).toBe('RS-101');
    expect(roomDiningLabel('Dorm A')).toBe('RS-Dorm-A');
    expect(roomDiningLabel('101')).not.toBe('ROOM 101');
    // The menu reads its table from the address as letters, digits and hyphens, so the label must be one of those.
    expect(roomDiningLabel('Villa 3 / West')).toMatch(/^[A-Za-z0-9-]+$/);
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';
import { assertPassUsable, claimPass, issuePass, loadPassByToken, quoteStay, readTender, releasePass, rotatePassLink } from './stay-pass.service';
import { checkInWithPass } from './pass-checkin.service';
import { grantLateCheckout } from './late-checkout.service';
import { passToken } from './pass-token';
import { EMPTY_POLICIES, policyFee, readExpectedArrival, readPolicies, STANDARD_POLICIES, validatePolicies } from './stay-policy';
import { creditLine, settleLedger } from './stay-ledger';
import { assertDishesOnly } from './room-dining';

const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER = 'ffffffff-1111-4222-8333-444444444444';
const CAT = 'cccccccc-1111-4222-8333-444444444444';
const R1 = 'bbbbbbbb-1111-4222-8333-444444444441';
const BOOKING = '99999999-1111-4222-8333-444444444444';
const TODAY = '2026-10-21';
const NOW = new Date('2026-10-21T08:00:00Z');
const policies = readPolicies(STANDARD_POLICIES);

const booking = (o: Record<string, unknown> = {}) => ({
  id: BOOKING, business_id: BIZ, category_id: CAT, check_in: '2026-10-21', check_out: '2026-10-23', guests: 2, guest_name: 'Asha Rao', guest_phone: '9876543210',
  guest_email: null, confirmation_code: 'ST-ABC234', status: 'confirmed', expected_arrival: 'standard', ...o,
});
const cat = { id: CAT, business_id: BIZ, name: 'Mount View', price: 3500 };
const room = (o: Record<string, unknown> = {}) => ({ id: R1, business_id: BIZ, category_id: CAT, room_number: '101', status: 'VACANT', selected_addons: [], category: cat, ...o });
const fresh = (extra: Record<string, unknown[]> = {}) => createFakeSupabase({
  room_categories: [cat], stay_booking_requests: [booking()], stay_passes: [], orders: [], rooms: [room()], room_stay_logs: [], ...extra,
}, { unique: { stay_passes: [['booking_id']] } });

beforeEach(() => { vi.stubEnv('STAFF_SESSION_SECRET', 'test-secret-for-passes'); });
afterEach(() => { vi.unstubAllEnvs(); });

describe('policies and fees', () => {
  it('drops what is malformed and prices an option from the night rate', () => {
    const p = readPolicies({ early_checkin: [{ time: '25:00', fee_type: 'flat', value: 5 }, { id: 'e1', time: '10:00', fee_type: 'percent', value: 25 }], late_checkout: 'nope' });
    expect(p.early_checkin).toHaveLength(1);
    expect(p.late_checkout).toEqual([]);
    expect(policyFee(p.early_checkin[0], 3500)).toBe(875);
    expect(policyFee({ fee_type: 'flat', value: 400 }, 3500)).toBe(400);
  });

  it('tells the owner what is wrong when saving', () => {
    expect(validatePolicies({ late_checkout: [{ time: '14:00', fee_type: 'percent', value: 150 }] })).toMatchObject({ ok: false });
    expect(validatePolicies(STANDARD_POLICIES)).toMatchObject({ ok: true });
    // The desk's number travels with the policies: digits only, India's 10 or up to 15 with a code; a bad one is refused, not dropped.
    expect(readPolicies({ front_desk: { phone: '+91 98765-43210', mode: 'whatsapp' } }).front_desk).toEqual({ phone: '919876543210', mode: 'whatsapp' });
    expect(readPolicies({ front_desk: { phone: '123', mode: 'sms' } }).front_desk).toEqual({ phone: null, mode: 'call' });
    expect(readPolicies(null).front_desk).toEqual({ phone: null, mode: 'call' });
    expect(validatePolicies({ front_desk: { phone: '123' } })).toMatchObject({ ok: false, error: expect.stringMatching(/10 digits/) });
  });

  it('keeps a guest\'s stated arrival only if the owner offers it', () => {
    expect(readExpectedArrival('early:early-10', policies)).toBe('early:early-10');
    expect(readExpectedArrival('early:made-up', policies)).toBe('standard');
    expect(readExpectedArrival('late', EMPTY_POLICIES)).toBe('late');
  });
});

describe('what the stay is worth and what is owed', () => {
  it('credits the advance once and reports a refund when the guest paid for more than they used', () => {
    expect(settleLedger({ folioTotal: 7000, diningTotal: 600, advancePaid: 7000 })).toEqual({ gross: 7600, credit: 7000, payable: 600, refundDue: 0 });
    expect(settleLedger({ folioTotal: 3500, advancePaid: 7000 })).toEqual({ gross: 3500, credit: 3500, payable: 0, refundDue: 3500 });
    expect(creditLine(7000)).toMatchObject({ price: -7000, qty: 1 });
  });

  it('quotes nights at the rate plus the early check-in fee, on the server', () => {
    const q = quoteStay({ categoryName: 'Mount View', rate: 3500, checkIn: '2026-10-21', checkOut: '2026-10-23', early: policies.early_checkin[0] });
    expect(q).toMatchObject({ nights: 2, tariff: 7000, earlyFee: 875, amount: 7875 });
    expect(q.lines.map((l) => l.type)).toEqual(['room_tariff', 'early_checkin']);
  });
});

describe('billing the room and issuing the pass', () => {
  it('writes a settled advance bill and a pass for the booked stay; the amount is not taken from the request', async () => {
    const db = fresh();
    const out = await issuePass(db, BIZ, { bookingId: BOOKING, paymentMethod: 'upi', paymentReference: '412345678901', idempotencyKey: 'k1', amount: 1 } as never, { policies, today: TODAY, now: NOW });
    expect(out.quote.amount).toBe(7000);
    expect(db.tables.orders[0]).toMatchObject({ order_type: 'room_advance', status: 'SETTLED', grand_total: 7000, payment_method: 'UPI', table_number: 'ADV ST-ABC234' });
    expect(out.pass).toMatchObject({ status: 'issued', amount: 7000, bill_order_id: db.tables.orders[0].id, guest_phone: '9876543210' });
    expect(db.tables.stay_passes[0].token_hash).toHaveLength(64);
    expect((await loadPassByToken(db, out.token)).id).toBe(out.pass.id);
  });

  it('asks for the bank reference on UPI and card, not on cash', () => {
    expect(() => readTender('upi', '')).toThrow(/UTR/);
    expect(() => readTender('card', 'ab')).toThrow(/approval code/);
    expect(readTender('cash', '')).toEqual({ tender: 'CASH', reference: '' });
    expect(() => readTender('wallet', '')).toThrow(/UPI, cash or card/);
  });

  it('returns the same pass for a repeated request and refuses to bill one booking twice', async () => {
    const db = fresh();
    const first = await issuePass(db, BIZ, { bookingId: BOOKING, paymentMethod: 'cash', idempotencyKey: 'k1' }, { policies, today: TODAY, now: NOW });
    const again = await issuePass(db, BIZ, { bookingId: BOOKING, paymentMethod: 'cash', idempotencyKey: 'k1' }, { policies, today: TODAY, now: NOW });
    expect(again.reused).toBe(true);
    expect(again.token).toBe(first.token);
    expect(db.tables.orders).toHaveLength(1);
    await expect(issuePass(db, BIZ, { bookingId: BOOKING, paymentMethod: 'cash', idempotencyKey: 'k2' }, { policies, today: TODAY, now: NOW })).rejects.toMatchObject({ code: 'CONFLICT' });
    // The second attempt left no bill behind.
    expect(db.tables.orders).toHaveLength(1);
  });

  it('bills an early check-in from the booking\'s stated arrival, and a walk-in without a booking', async () => {
    const db = fresh({ stay_booking_requests: [booking({ expected_arrival: 'early:early-10' })] });
    const early = await issuePass(db, BIZ, { bookingId: BOOKING, paymentMethod: 'cash' }, { policies, today: TODAY, now: NOW });
    expect(early.quote).toMatchObject({ amount: 7875, earlyFee: 875 });

    const walkIn = fresh({ stay_booking_requests: [] });
    const w = await issuePass(walkIn, BIZ, { categoryId: CAT, checkOut: '2026-10-22', guestName: 'Ravi', guestPhone: '9000000002', guests: 1, paymentMethod: 'cash' }, { policies, today: TODAY, now: NOW });
    expect(w.pass).toMatchObject({ booking_id: null, nights: 1, amount: 3500 });
  });

  it('will not bill another venue\'s booking or an ended stay', async () => {
    const db = fresh();
    await expect(issuePass(db, OTHER, { bookingId: BOOKING, paymentMethod: 'cash' }, { policies, today: TODAY })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    const ended = fresh({ stay_booking_requests: [booking({ check_in: '2026-10-19', check_out: '2026-10-21' })] });
    await expect(issuePass(ended, BIZ, { bookingId: BOOKING, paymentMethod: 'cash' }, { policies, today: TODAY })).rejects.toMatchObject({ code: 'INVALID' });
  });
});

describe('the pass link', () => {
  it('is derived, rotates, and a rotated link no longer finds the pass', async () => {
    const db = fresh();
    const { pass, token } = await issuePass(db, BIZ, { bookingId: BOOKING, paymentMethod: 'cash' }, { policies, today: TODAY, now: NOW });
    expect(passToken(pass.id, 1)).toBe(token);
    const next = await rotatePassLink(db, BIZ, pass.id);
    expect(next).not.toBe(token);
    await expect(loadPassByToken(db, token)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect((await loadPassByToken(db, next)).id).toBe(pass.id);
    await expect(loadPassByToken(db, 'short')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('is used once; a failure gives it back', async () => {
    const db = fresh();
    const { pass } = await issuePass(db, BIZ, { bookingId: BOOKING, paymentMethod: 'cash' }, { policies, today: TODAY, now: NOW });
    await claimPass(db, pass.id, NOW);
    await expect(claimPass(db, pass.id, NOW)).rejects.toMatchObject({ code: 'USED' });
    await releasePass(db, pass.id);
    await claimPass(db, pass.id, NOW);
    expect(() => assertPassUsable({ ...pass, status: 'void' }, NOW)).toThrow(/cancelled/);
    expect(() => assertPassUsable({ ...pass, expires_at: '2026-10-20T00:00:00Z' }, NOW)).toThrow(/expired/);
  });
});

describe('checking in with a pass', () => {
  const details = { idType: 'Aadhaar', idNumber: '1234', guestName: 'Asha Rao' };

  it('releases a room with the advance on it, closes the booking and ties the bill to the room', async () => {
    const db = fresh();
    const { pass } = await issuePass(db, BIZ, { bookingId: BOOKING, paymentMethod: 'cash' }, { policies, today: TODAY, now: NOW });
    const r = await checkInWithPass(db, BIZ, pass as never, details, { today: TODAY, checkoutTime: '11:00', now: NOW });
    expect(r.room).toMatchObject({ id: R1, status: 'OCCUPIED', advance_paid: 7000, checkin_source: 'booking', id_verified_at: null, guest_phone: '9876543210' });
    expect(db.tables.stay_passes[0]).toMatchObject({ status: 'used', used_room_id: R1 });
    expect(db.tables.stay_booking_requests[0]).toMatchObject({ status: 'checked_in', room_id: R1 });
    expect(db.tables.orders.find((o: any) => o.order_type === 'room_advance')?.room_id).toBe(R1);
    expect(db.tables.room_stay_logs[0]).toMatchObject({ advance_paid: 7000 });
  });

  it('keeps the pass for the guest when no room is free, and takes the early fee onto the stay', async () => {
    const full = fresh({ rooms: [room({ status: 'OCCUPIED' })] });
    const { pass } = await issuePass(full, BIZ, { bookingId: BOOKING, paymentMethod: 'cash' }, { policies, today: TODAY, now: NOW });
    await expect(checkInWithPass(full, BIZ, pass as never, details, { today: TODAY, now: NOW })).rejects.toMatchObject({ code: 'NO_ROOM' });
    expect(full.tables.stay_passes[0].status).toBe('issued');

    const early = fresh({ stay_booking_requests: [booking({ expected_arrival: 'early:early-10' })] });
    const e = await issuePass(early, BIZ, { bookingId: BOOKING, paymentMethod: 'cash' }, { policies, today: TODAY, now: NOW });
    const r = await checkInWithPass(early, BIZ, e.pass as never, details, { today: TODAY, now: NOW });
    expect(r.room.stay_extras).toEqual([expect.objectContaining({ type: 'early_checkin', price: 875 })]);
    expect(r.room.advance_paid).toBe(7875);
  });

  it('refuses another venue\'s pass', async () => {
    const db = fresh();
    const { pass } = await issuePass(db, BIZ, { bookingId: BOOKING, paymentMethod: 'cash' }, { policies, today: TODAY, now: NOW });
    await expect(checkInWithPass(db, OTHER, pass as never, details, { today: TODAY, now: NOW })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('late check-out', () => {
  const occupied = () => room({ status: 'OCCUPIED', guest_name: 'Asha Rao', guest_phone: '9876543210', check_out_time: '2026-10-22T05:30:00.000Z', advance_paid: 3500, stay_extras: [], late_checkout_request: { status: 'pending', option_id: 'late-14' } });

  it('moves the check-out, takes the fee as an advance and a bill line, and is not granted twice', async () => {
    const db = fresh({ rooms: [occupied()] });
    const out = await grantLateCheckout(db, BIZ, R1, { paymentMethod: 'upi', paymentReference: '998877665544' }, policies, NOW);
    expect(out).toMatchObject({ fee: 875, label: 'Late check-out until 14:00', until: '2026-10-22T08:30:00.000Z' });
    expect(db.tables.rooms[0]).toMatchObject({ check_out_time: '2026-10-22T08:30:00.000Z', advance_paid: 4375, late_checkout_request: null });
    expect(db.tables.rooms[0].stay_extras).toEqual([expect.objectContaining({ type: 'late_checkout', price: 875 })]);
    expect(db.tables.orders[0]).toMatchObject({ order_type: 'room_advance', status: 'SETTLED', grand_total: 875, room_id: R1 });
    // A second tap, or a second desk, is refused and charges nothing more.
    await expect(grantLateCheckout(db, BIZ, R1, { optionId: 'late-14', paymentMethod: 'cash' }, policies, NOW)).rejects.toMatchObject({ code: 'INVALID' });
    expect(db.tables.orders).toHaveLength(1);
    expect(db.tables.rooms[0].advance_paid).toBe(4375);
  });

  it('needs the payment reference, and an option the owner offers', async () => {
    const db = fresh({ rooms: [occupied()] });
    await expect(grantLateCheckout(db, BIZ, R1, { paymentMethod: 'upi' }, policies, NOW)).rejects.toMatchObject({ code: 'INVALID' });
    await expect(grantLateCheckout(db, BIZ, R1, { optionId: 'nope', paymentMethod: 'cash' }, policies, NOW)).rejects.toMatchObject({ code: 'INVALID' });
    expect(db.tables.orders).toHaveLength(0);
  });
});

describe('charge to room is for food and drinks', () => {
  it('accepts dishes and refuses a tour, a room or an item that is not on the menu', async () => {
    const db = createFakeSupabase({ catalog_items: [
      { id: 'd1', business_id: BIZ, item_type: 'food', category: 'Mains' }, { id: 't1', business_id: BIZ, item_type: 'service', category: 'Tours' }, { id: 'o1', business_id: OTHER, item_type: 'food', category: 'Mains' },
    ] });
    await expect(assertDishesOnly(db, BIZ, [{ item_id: 'd1' }])).resolves.toBeUndefined();
    await expect(assertDishesOnly(db, BIZ, [{ item_id: 'd1' }, { item_id: 't1' }])).rejects.toMatchObject({ code: 'NOT_A_DISH', status: 400 });
    await expect(assertDishesOnly(db, BIZ, [{ id: 'o1' }])).rejects.toMatchObject({ code: 'NOT_A_DISH' });
  });
});

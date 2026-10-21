import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createFakeSupabase, type FakeSupabase } from '@/lib/testing/fake-supabase';

// The whole stay, through the real route handlers and one shared fake database: a guest reserves, the desk takes payment
// and issues the pass, the guest checks in and uses the room page, asks for a late check-out, orders food, and the desk
// checks them out. A controlled clock puts the check-out two days after check-in. The failures this suite exists to catch:
// a room billed twice, an advance credited twice or not at all, a pass used twice, a paid guest left without a room.

let db: FakeSupabase;
vi.mock('@/lib/auth/guards', () => ({ requireHost: async () => ({ businessId: 'biz-1', supabase: db, staff: null }), adminDb: () => db }));
vi.mock('@/lib/supabase/admin', () => ({ adminDb: () => db }));
vi.mock('@/lib/auth/guest-validate', () => ({ validateGuestAccess: async () => ({ businessId: 'biz-1', error: null }) }));
vi.mock('@/lib/middleware/rate-limiter', () => ({ enforceRateLimit: async () => null }));
vi.mock('@/lib/services/guest/staff-call.service', () => ({ recordStaffCall: async () => ({ ok: true, duplicate: false }), cleanCallMessage: (m: string) => m }));
vi.mock('@/lib/services/security/master-unlock-guard', () => ({ masterUnlockRequired: () => null }));
vi.mock('@/lib/services/wallet/fee-guard.service', () => ({ invoiceRefFromId: (id: string) => id, generateInvoiceRef: () => 'x', evaluateFeeGuard: async () => ({}) }));

const BIZ = 'biz-1';
const CAT = 'cccccccc-1111-4222-8333-444444444444';
const policies = {
  early_checkin: [{ id: 'early-10', label: 'Early check-in from 10:00', time: '10:00', fee_type: 'percent', value: 25 }],
  late_checkout: [{ id: 'late-14', label: 'Late check-out until 14:00', time: '14:00', fee_type: 'percent', value: 25 }],
};
const business = { id: BIZ, business_name: 'Bombay Rasoi', name: 'Bombay Rasoi', slug: 'bombay-rasoi', in_room_dining_enabled: true, self_checkin_enabled: true, checkin_time: '14:00', checkout_time: '11:00', menu_info: { address: 'Manali' }, stay_policies: policies, gst_number: null, upi_id: 'venue@upi' };
const category = { id: CAT, business_id: BIZ, name: 'Mount View', price: 3500, occupancy: 2 };
const room = (n: number) => ({ id: `room-${n}`, business_id: BIZ, category_id: CAT, room_number: `suite${n}`, status: 'VACANT', selected_addons: [], advance_paid: 0, stay_extras: [], qr_code_hash: null, category, business });
const D = (iso: string) => new Date(iso);

const req = (path: string, init: { method?: string; body?: unknown; cookie?: string } = {}) =>
  new Request(`http://localhost${path}`, { method: init.method || 'GET', headers: { 'content-type': 'application/json', ...(init.cookie ? { cookie: init.cookie } : {}) }, body: init.body ? JSON.stringify(init.body) : undefined });
const json = async (res: Response) => ({ status: res.status, body: await res.json(), headers: res.headers });
const idParams = (id: string) => ({ params: Promise.resolve({ id }) });
const codeParams = (code: string) => ({ params: Promise.resolve({ code }) });

const seed = (rooms = 4) => createFakeSupabase({
  businesses: [business], room_categories: [category], rooms: Array.from({ length: rooms }, (_, i) => room(i + 1)),
  stay_booking_requests: [], stay_passes: [], orders: [], kitchen_tickets: [], room_stay_logs: [], venue_operating_hours: [],
  guest_accounts: [], guest_auth_sessions: [], guest_wallets: [], wallet_transactions: [], order_items: [],
}, { unique: { stay_passes: [['booking_id']].map(() => ({ cols: ['booking_id'], where: (r: any) => r.status !== 'void' })) as any } });

beforeEach(() => {
  vi.stubEnv('STAFF_SESSION_SECRET', 'pipeline-test-secret');
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(D('2026-10-21T08:00:00Z')); // 13:30 India time
  db = seed();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

async function reserve(name = 'Asha Rao', phone = '9876543210', arrival = 'standard') {
  const { POST } = await import('@/app/api/guest/stay/book/route');
  return json(await POST(req('/api/guest/stay/book', { method: 'POST', body: { venue: BIZ, category_id: CAT, guest_name: name, guest_phone: phone, check_in: '2026-10-21', check_out: '2026-10-23', guests: 2, expected_arrival: arrival } })));
}
async function bill(bookingId: string, extra: Record<string, unknown> = {}) {
  const { POST } = await import('@/app/api/host/accommodations/passes/route');
  return json(await POST(req('/api/host/accommodations/passes', { method: 'POST', body: { booking_id: bookingId, payment_method: 'UPI', payment_reference: '412345678901', idempotency_key: `k-${bookingId}`, ...extra } })));
}
async function checkIn(token: string, extra: Record<string, unknown> = {}) {
  const { POST } = await import('@/app/api/guest/stay/checkin/route');
  return json(await POST(req('/api/guest/stay/checkin', { method: 'POST', body: { venue: BIZ, pass_token: token, guest_name: 'Asha Rao', id_type: 'Aadhaar', id_number: '1234', total_guests: 2, dpdp_consent_accepted: true, ...extra } })));
}
const tokenOf = (link: string) => new URL(link).searchParams.get('p') as string;
const bookingId = () => db.tables.stay_booking_requests[0].id as string;

describe('reserve, pay, check in', () => {
  it('a reservation is free and confirmed, and the front desk holds a room for it', async () => {
    const r = await reserve();
    expect(r.status).toBe(201);
    expect(r.body.booking).toMatchObject({ status: 'confirmed', room_type: 'Mount View' });
    expect(db.tables.orders).toHaveLength(0); // nothing billed, nothing paid
    const { assignReservedRooms } = await import('./reservation-overlay');
    const held = assignReservedRooms(db.tables.rooms as any, db.tables.stay_booking_requests as any, '2026-10-21');
    expect(Array.from(held.keys())).toEqual(['room-1']);
  });

  it('the desk quotes on the server, takes payment, and the bill and pass agree', async () => {
    await reserve('Asha Rao', '9876543210', 'early:early-10');
    const { POST } = await import('@/app/api/host/accommodations/passes/route');
    const quote = await json(await POST(req('/api/host/accommodations/passes', { method: 'POST', body: { booking_id: bookingId(), preview: true } })));
    expect(quote.body.quote).toMatchObject({ nights: 2, tariff: 7000, earlyFee: 875, amount: 7875 });

    const paid = await bill(bookingId(), { amount: 1 }); // a client-supplied amount is ignored
    expect(paid.status).toBe(201);
    expect(paid.body.pass).toMatchObject({ amount: 7875, status: 'issued', payment_method: 'UPI' });
    expect(db.tables.orders[0]).toMatchObject({ order_type: 'room_advance', status: 'SETTLED', grand_total: 7875 });
    expect(db.tables.orders[0].items.map((l: any) => l.name)).toEqual(['Mount View · 2 nights', 'Early check-in from 10:00']);
  });

  it('a repeated tap bills once; a second bill for the same booking is refused', async () => {
    await reserve();
    const a = await bill(bookingId());
    const b = await bill(bookingId());
    expect(b.status).toBe(200);
    expect(b.body.reused).toBe(true);
    expect(b.body.pass.link).toBe(a.body.pass.link);
    const other = await bill(bookingId(), { idempotency_key: 'a-different-tap' });
    expect(other.status).toBe(409);
    expect(db.tables.orders.filter((o: any) => o.order_type === 'room_advance')).toHaveLength(1);
  });

  it('the guest finds the paid pass with the code and the last four digits, and nobody else does', async () => {
    const r = await reserve();
    const code = r.body.booking.code;
    const { POST } = await import('@/app/api/guest/stay/pass/lookup/route');
    const ask = async (digits: string) => json(await POST(req('/api/guest/stay/pass/lookup', { method: 'POST', body: { venue: BIZ, code, phone_last4: digits } })));

    expect((await ask('3210')).body).toMatchObject({ state: 'unpaid', amount: 7000 });
    expect((await ask('0000')).status).toBe(404);
    const paid = await bill(bookingId());
    const ready = await ask('3210');
    expect(ready.body.state).toBe('ready');
    expect(ready.body.pass_token).toBe(tokenOf(paid.body.pass.link));
  });

  it('the guest page shows the bill but never the phone or the payment reference', async () => {
    await reserve();
    const paid = await bill(bookingId());
    const { GET } = await import('@/app/api/guest/stay/pass/route');
    const view = await json(await GET(req(`/api/guest/stay/pass?venue=${BIZ}&p=${tokenOf(paid.body.pass.link)}`)));
    expect(view.body.pass).toMatchObject({ status: 'issued', amount: 7000, room_type: 'Mount View', guest_first_name: 'Asha' });
    expect(JSON.stringify(view.body)).not.toMatch(/9876543210|412345678901/);
  });

  it('check-in releases the first free room with the advance on it, once, and closes the booking', async () => {
    await reserve();
    const paid = await bill(bookingId());
    const token = tokenOf(paid.body.pass.link);
    const done = await checkIn(token);
    expect(done.status).toBe(200);
    expect(done.headers.get('set-cookie')).toMatch(/qc_room_/);
    expect(db.tables.rooms[0]).toMatchObject({ status: 'OCCUPIED', advance_paid: 7000, checkin_source: 'booking', id_verified_at: null });
    expect(db.tables.stay_booking_requests[0]).toMatchObject({ status: 'checked_in', room_id: 'room-1' });
    expect(db.tables.stay_passes[0]).toMatchObject({ status: 'used', used_room_id: 'room-1' });
    expect(db.tables.orders.find((o: any) => o.order_type === 'room_advance')?.room_id).toBe('room-1');

    const again = await checkIn(token);
    expect(again.status).toBe(409);
    expect(db.tables.rooms.filter((r: any) => r.status === 'OCCUPIED')).toHaveLength(1);
  });

  it('a link that is not a pass, or belongs to another venue, opens nothing', async () => {
    await reserve();
    const paid = await bill(bookingId());
    expect((await checkIn('x'.repeat(43))).status).toBe(404);
    db.tables.stay_passes[0].business_id = 'other-venue';
    expect((await checkIn(tokenOf(paid.body.pass.link))).status).toBe(404);
    expect(db.tables.rooms.every((r: any) => r.status === 'VACANT')).toBe(true);
  });
});

describe('stress: concurrent and failing check-ins', () => {
  it('two taps on one link check in one guest', async () => {
    await reserve();
    const token = tokenOf((await bill(bookingId())).body.pass.link);
    const [a, b] = await Promise.all([checkIn(token), checkIn(token)]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect(db.tables.rooms.filter((r: any) => r.status === 'OCCUPIED')).toHaveLength(1);
  });

  it('two paid guests and one free room: one gets it, the other keeps their pass', async () => {
    db = seed(2);
    await reserve('Asha Rao', '9876543210');
    await reserve('Ravi Kumar', '9000000002');
    const [b1, b2] = db.tables.stay_booking_requests.map((b: any) => b.id);
    const t1 = tokenOf((await bill(b1)).body.pass.link);
    const t2 = tokenOf((await bill(b2)).body.pass.link);
    db.tables.rooms[1].status = 'MAINTENANCE'; // the second room goes out of service after both were paid for
    const results = await Promise.all([checkIn(t1), checkIn(t2)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const loser = results[0].status === 200 ? 1 : 0;
    expect(db.tables.stay_passes[loser].status).toBe('issued'); // never lost
    expect(db.tables.stay_booking_requests[loser].status).toBe('confirmed');
  });

  it('a paid guest whose check-in fails halfway still has the pass', async () => {
    await reserve();
    const token = tokenOf((await bill(bookingId())).body.pass.link);
    db.tables.rooms.forEach((r: any) => { r.status = 'MAINTENANCE'; });
    const failed = await checkIn(token);
    expect(failed.status).toBe(409);
    expect(db.tables.stay_passes[0].status).toBe('issued');
    db.tables.rooms[2].status = 'VACANT';
    expect((await checkIn(token)).status).toBe(200);
  });

  it('a paid stay cannot be cancelled like an unpaid one', async () => {
    await reserve();
    await bill(bookingId());
    const { PATCH } = await import('@/app/api/host/accommodations/bookings/route');
    const res = await json(await PATCH(req('/api/host/accommodations/bookings', { method: 'PATCH', body: { id: bookingId(), action: 'cancel' } })));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PAID');
  });

  it('the desk checking in a paid booking takes the pass and carries the advance, and the guest link then stops', async () => {
    await reserve();
    const paid = await bill(bookingId());
    const { PATCH } = await import('@/app/api/host/accommodations/rooms/[id]/status/route');
    const res = await json(await PATCH(req('/api/host/accommodations/rooms/room-2/status', { method: 'PATCH', body: { action: 'check-in', booking_id: bookingId(), guest_name: 'Asha Rao', guest_phone: '9876543210', id_type: 'Aadhaar', id_number: '1234', total_guests: 2, check_out_time: '2026-10-23T05:30:00.000Z' } }), idParams('room-2')));
    expect(res.status).toBe(200);
    expect(db.tables.rooms[1]).toMatchObject({ status: 'OCCUPIED', advance_paid: 7000, checkin_source: 'booking' });
    expect(db.tables.stay_passes[0].status).toBe('used');
    expect((await checkIn(tokenOf(paid.body.pass.link))).status).toBe(409);
  });
});

describe('the stay, to the final invoice', () => {
  it('credits the advance once, counts only this stay\'s orders, merges repeated dishes and lists no line twice', async () => {
    await reserve();
    const paid = await bill(bookingId());
    const stay = await checkIn(tokenOf(paid.body.pass.link));
    const code = stay.body.room_code as string;
    const cookie = String(stay.headers.get('set-cookie')).split(';')[0];
    const roomId = 'room-1';

    // The guest's page: the room is paid, so nothing is owed yet, and the late check-out options are priced for this room.
    const { GET: roomGet } = await import('@/app/api/guest/room/[code]/route');
    const page = await json(await roomGet(req(`/api/guest/room/${code}`, { cookie }), codeParams(code)));
    expect(page.body).toMatchObject({ occupied: true, verified: true });
    // Day one of two: the stay is billed for the two nights booked, so the whole 7,000 paid offsets it and nothing is owed.
    expect(page.body.folio).toMatchObject({ nights: 2, nights_stayed: 1, nights_booked: 2, advance_paid: 7000, advance_total: 7000, balance: 0 });
    // The bill page carries the desk's tax invoice for the room: its number, lines and tender, never the phone or the UTR.
    expect(page.body.invoice).toMatchObject({ amount: 7000, nights: 2, invoice_id: expect.any(String), lines: expect.arrayContaining([expect.objectContaining({ id: 'tariff' })]) });
    expect(page.body.invoice).not.toHaveProperty('guest_phone');
    expect(page.body.invoice).not.toHaveProperty('payment_reference');
    expect(page.body.business).toMatchObject({ gstin: null, address: 'Manali', front_desk: { phone: null, mode: 'call' } });
    expect(page.body.late_checkout.options).toEqual([expect.objectContaining({ id: 'late-14', fee: 875 })]);
    // Offered because no one is due in a Mount View after the check-out; a reservation for that night withdraws it.
    expect(page.body.late_checkout.available).toBe(true);
    db.tables.stay_booking_requests.push({ id: 'next', business_id: BIZ, category_id: CAT, status: 'confirmed', check_in: '2026-10-23', check_out: '2026-10-24', guests: 1 }, { id: 'next2', business_id: BIZ, category_id: CAT, status: 'confirmed', check_in: '2026-10-23', check_out: '2026-10-24', guests: 1 }, { id: 'next3', business_id: BIZ, category_id: CAT, status: 'confirmed', check_in: '2026-10-23', check_out: '2026-10-24', guests: 1 }, { id: 'next4', business_id: BIZ, category_id: CAT, status: 'confirmed', check_in: '2026-10-23', check_out: '2026-10-24', guests: 1 });
    expect((await json(await roomGet(req(`/api/guest/room/${code}`, { cookie }), codeParams(code)))).body.late_checkout.available).toBe(false);
    db.tables.stay_booking_requests = db.tables.stay_booking_requests.filter((b: any) => !String(b.id).startsWith('next'));
    expect((await json(await roomGet(req(`/api/guest/room/${code}`), codeParams(code)))).body.verified).toBe(false); // no cookie, no bill
    // The menu's light view: the room and the kitchen, verified, but no bill read for a page that never shows one.
    const light = (await json(await roomGet(req(`/api/guest/room/${code}?view=menu`, { cookie }), codeParams(code)))).body;
    expect(light).toMatchObject({ occupied: true, verified: true, folio: null, invoice: null, late_checkout: null, dining: { enabled: true } });

    // They ask for a late check-out; the desk approves and takes the fee.
    const { POST: ask } = await import('@/app/api/guest/room/[code]/late-checkout/route');
    expect((await json(await ask(req(`/api/guest/room/${code}/late-checkout`, { method: 'POST', cookie, body: { option_id: 'late-14' } }), codeParams(code)))).status).toBe(200);
    expect(db.tables.rooms[0].late_checkout_request).toMatchObject({ status: 'pending', fee: 875 });
    const { POST: late } = await import('@/app/api/host/accommodations/rooms/[id]/late-checkout/route');
    const grant = await json(await late(req('/api/host/accommodations/rooms/room-1/late-checkout', { method: 'POST', body: { action: 'grant', payment_method: 'CASH' } }), idParams(roomId)));
    expect(grant.body).toMatchObject({ success: true, fee: 875 });
    expect(db.tables.rooms[0]).toMatchObject({ advance_paid: 7875, late_checkout_request: null });

    // Food ordered to the room: the same dish twice, plus an order an earlier stay left open on this room.
    const dish = (id: string, at: string) => ({ id, business_id: BIZ, room_id: roomId, order_type: 'room_service', status: 'pending', grand_total: 40, items: [{ id: 'dal', name: 'Dal', price: 40, qty: 1 }], created_at: at });
    db.tables.orders.push(dish('o1', '2026-10-21T10:00:00Z'), dish('o2', '2026-10-22T10:00:00Z'));
    db.tables.orders.push({ id: 'stale', business_id: BIZ, room_id: roomId, order_type: 'room_service', status: 'pending', grand_total: 3500, items: [{ id: 'tariff-room-1', name: 'Room suite1 · MOUNT VIEW', price: 3500, qty: 1 }], created_at: '2026-10-20T20:00:00Z' });

    // Two days on: what the desk sees, then checkout.
    vi.setSystemTime(D('2026-10-23T04:00:00Z'));
    const { GET: dossier } = await import('@/app/api/host/accommodations/rooms/[id]/dossier/route');
    const d = await json(await dossier(req('/api/host/accommodations/rooms/room-1/dossier'), idParams(roomId)));
    expect(d.body.billingSummary).toMatchObject({ nights: 2, ordersSubtotal: 80, advancePaid: 7875, grandTotalPayable: 80 });

    const { POST: checkout } = await import('@/app/api/host/accommodations/rooms/[id]/checkout/route');
    const out = await json(await checkout(req('/api/host/accommodations/rooms/room-1/checkout', { method: 'POST', body: {} }), idParams(roomId)));
    expect(out.status).toBe(200);
    const items = out.body.invoice.items as Array<{ id: string; name: string; price: number; qty: number }>;
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length); // the crash: no line twice
    expect(items.filter((i) => i.id.startsWith('tariff-'))).toHaveLength(1); // the room is billed once
    expect(items.find((i) => i.id === 'dal')).toMatchObject({ qty: 2 });
    expect(items.find((i) => i.id === 'advance-paid')).toMatchObject({ price: -7875 });
    expect(out.body.invoice.grandTotal).toBe(80);
    expect(items.reduce((s, i) => s + i.price * i.qty, 0)).toBe(80); // the lines add up to what is payable
    expect(out.body.checkoutSummary).toMatchObject({ grossAmount: 7955, advanceCredited: 7875, refundDue: 0 });
    expect(db.tables.orders.find((o: any) => o.id === 'stale')?.status).toBe('pending'); // another stay's order is left alone
    expect(db.tables.rooms[0]).toMatchObject({ status: 'CLEANING', advance_paid: 0, stay_extras: [], late_checkout_request: null });
    expect(db.tables.room_stay_logs[0]).toMatchObject({ advance_paid: 7875, total_billed_amount: 7955 });

    // The guest tendered the balance; the invoice settles once.
    const settle = await json(await checkout(req('/api/host/accommodations/rooms/room-1/checkout', { method: 'POST', body: { payment_method: 'UPI' } }), idParams(roomId)));
    expect(settle.body).toMatchObject({ success: true, settled_pending_invoice: true });
    expect((await json(await checkout(req('/api/host/accommodations/rooms/room-1/checkout', { method: 'POST', body: { payment_method: 'UPI' } }), idParams(roomId)))).status).toBe(409);
  });

  it('a guest who booked two nights and leaves after one is billed the two nights, with nothing owed back', async () => {
    await reserve();
    const stay = await checkIn(tokenOf((await bill(bookingId())).body.pass.link));
    expect(stay.status).toBe(200);
    vi.setSystemTime(D('2026-10-21T15:00:00Z')); // the same night: one night used of two booked and paid
    const { GET: dossier } = await import('@/app/api/host/accommodations/rooms/[id]/dossier/route');
    const d = await json(await dossier(req('/api/host/accommodations/rooms/room-1/dossier'), idParams('room-1')));
    expect(d.body.billingSummary).toMatchObject({ nights: 2, bookedNights: 2, nightsStayed: 1, roomTariffSubtotal: 7000, advancePaid: 7000, refundDue: 0, grandTotalPayable: 0 });
    const { POST: checkout } = await import('@/app/api/host/accommodations/rooms/[id]/checkout/route');
    const out = await json(await checkout(req('/api/host/accommodations/rooms/room-1/checkout', { method: 'POST', body: {} }), idParams('room-1')));
    expect(out.body.invoice.grandTotal).toBe(0);
    expect(out.body.checkoutSummary).toMatchObject({ grossAmount: 7000, advanceCredited: 7000, refundDue: 0, nights: 2 });
    expect(out.body.invoice.items.find((i: any) => i.id.startsWith('tariff-'))).toMatchObject({ qty: 2 });
    expect(out.body.warnings || []).toEqual([]);
  });

  it('a guest who stays a third night on a two-night booking is billed three', async () => {
    await reserve();
    await checkIn(tokenOf((await bill(bookingId())).body.pass.link));
    vi.setSystemTime(D('2026-10-24T04:00:00Z')); // three calendar nights after check-in
    const { POST: checkout } = await import('@/app/api/host/accommodations/rooms/[id]/checkout/route');
    const out = await json(await checkout(req('/api/host/accommodations/rooms/room-1/checkout', { method: 'POST', body: {} }), idParams('room-1')));
    expect(out.body.checkoutSummary).toMatchObject({ nights: 3, grossAmount: 10500, advanceCredited: 7000 });
    expect(out.body.invoice.grandTotal).toBe(3500);
  });

  it('a payment taken during the stay shows as paid for the guest and the desk, and checkout bills only the rest', async () => {
    await reserve();
    const stay = await checkIn(tokenOf((await bill(bookingId())).body.pass.link));
    const code = stay.body.room_code as string;
    const cookie = String(stay.headers.get('set-cookie')).split(';')[0];
    db.tables.orders.push({ id: 'o1', business_id: BIZ, room_id: 'room-1', order_type: 'room_service', status: 'pending', grand_total: 660, items: [{ id: 'pav', name: 'Pav Bhaji', price: 220, qty: 3 }], created_at: '2026-10-21T10:00:00Z' });

    // The guest asks to pay now from the bill tab; the desk sees the request and takes it.
    const { POST: askPay } = await import('@/app/api/guest/room/[code]/checkout-request/route');
    expect((await json(await askPay(req(`/api/guest/room/${code}/checkout-request`, { method: 'POST', cookie, body: { action: 'request', kind: 'bill' } }), codeParams(code)))).status).toBe(200);
    expect(db.tables.rooms[0].checkout_request).toMatchObject({ kind: 'bill', status: 'pending' });
    const { POST: pay } = await import('@/app/api/host/accommodations/rooms/[id]/payment/route');
    const quote = await json(await pay(req('/api/host/accommodations/rooms/room-1/payment', { method: 'POST', body: { action: 'preview' } }), idParams('room-1')));
    expect(quote.body).toMatchObject({ quote: { amount: 660 }, paid_so_far: 7000 });
    const taken = await json(await pay(req('/api/host/accommodations/rooms/room-1/payment', { method: 'POST', body: { action: 'record', payment_method: 'CASH', purpose: 'balance', idempotency_key: 'pay-1' } }), idParams('room-1')));
    expect(taken.body).toMatchObject({ success: true, amount: 660, paidSoFar: 7660, balance: 0 });
    expect(db.tables.rooms[0]).toMatchObject({ advance_paid: 7660, checkout_request: null });

    // The guest's bill now reads paid; a second tap on the same sheet records nothing more.
    const { GET: roomGet } = await import('@/app/api/guest/room/[code]/route');
    const page = await json(await roomGet(req(`/api/guest/room/${code}`, { cookie }), codeParams(code)));
    expect(page.body.folio).toMatchObject({ advance_total: 7660, balance: 0, dining_total: 660 });
    expect((await json(await pay(req('/api/host/accommodations/rooms/room-1/payment', { method: 'POST', body: { action: 'record', payment_method: 'CASH', idempotency_key: 'pay-1' } }), idParams('room-1')))).body.amount).toBe(660);
    expect(db.tables.orders.filter((o: any) => o.order_type === 'room_advance')).toHaveLength(2);

    // Checkout two days on: everything was paid, the invoice is for nothing, the food is settled and no refund is owed.
    vi.setSystemTime(D('2026-10-23T04:00:00Z'));
    const { POST: checkout } = await import('@/app/api/host/accommodations/rooms/[id]/checkout/route');
    const out = await json(await checkout(req('/api/host/accommodations/rooms/room-1/checkout', { method: 'POST', body: {} }), idParams('room-1')));
    expect(out.body.checkoutSummary).toMatchObject({ grossAmount: 7660, advanceCredited: 7660, refundDue: 0 });
    expect(out.body.invoice.grandTotal).toBe(0);
  });

  it('a part payment from the till is adjusted in the stay: the guest stays checked in and the room page shows it paid', async () => {
    await reserve();
    const stay = await checkIn(tokenOf((await bill(bookingId())).body.pass.link)); // ₹7,000 paid for two nights
    const code = stay.body.room_code as string;
    const cookie = String(stay.headers.get('set-cookie')).split(';')[0];
    db.tables.orders.push({ id: 'o1', business_id: BIZ, room_id: 'room-1', order_type: 'room_service', status: 'pending', grand_total: 3650, items: [{ id: 'thali', name: 'Thali', price: 3650, qty: 1 }], created_at: '2026-10-21T10:00:00Z' });
    db.tables.kitchen_tickets.push({ id: 'kt1', business_id: BIZ, order_id: 'o1', status: 'PREPARING', ticket_number: 'KOT-7', table_or_room: 'RS-suite1' });

    // The till loads the folio (₹3,650 owed) and the host takes ₹2,000 with "adjust in the stay": no checkout happens.
    const { POST: createOrder } = await import('@/app/api/host/orders/create/route');
    const part = await json(await createOrder(req('/api/host/orders/create', { method: 'POST', body: { id: 'bill-1', roomId: 'room-1', tableNumber: 'ROOM suite1', paymentMethod: 'UPI', grandTotal: 3650, settlement: { session_id: null, mode: 'payment', amount: 2000 } } })));
    expect(part.status).toBe(200);
    expect(part.body).toMatchObject({ success: true, settled: true, payment: { amount: 2000, balance: 1650, paidSoFar: 9000 } });
    expect(db.tables.rooms[0]).toMatchObject({ status: 'OCCUPIED', advance_paid: 9000 });
    expect(db.tables.orders.find((o: any) => o.id === 'o1')?.status).toBe('pending'); // the food is still open on the room
    // A retried save of the same receipt takes nothing more; more than is owed is refused.
    expect((await json(await createOrder(req('/api/host/orders/create', { method: 'POST', body: { id: 'bill-1', roomId: 'room-1', paymentMethod: 'UPI', grandTotal: 3650, settlement: { mode: 'payment', amount: 2000 } } })))).body.payment.paidSoFar).toBe(9000);
    expect((await json(await createOrder(req('/api/host/orders/create', { method: 'POST', body: { id: 'bill-2', roomId: 'room-1', paymentMethod: 'CASH', grandTotal: 9999, settlement: { mode: 'payment' } } })))).status).toBe(400);
    expect(db.tables.rooms[0].advance_paid).toBe(9000);

    // The guest's room page: ₹2,000 more paid, ₹1,650 pending, and the kitchen's status on the order for the tracker.
    const { GET: roomGet } = await import('@/app/api/guest/room/[code]/route');
    const page = await json(await roomGet(req(`/api/guest/room/${code}`, { cookie }), codeParams(code)));
    expect(page.body.occupied).toBe(true);
    expect(page.body.folio).toMatchObject({ advance_total: 9000, balance: 1650, dining_total: 3650 });
    expect(page.body.folio.orders[0]).toMatchObject({ id: 'o1', kot_status: 'PREPARING', ticket_number: 'KOT-7' });

    // Checkout later bills only the rest.
    vi.setSystemTime(D('2026-10-23T04:00:00Z'));
    const out = await json(await createOrder(req('/api/host/orders/create', { method: 'POST', body: { roomId: 'room-1', paymentMethod: 'CASH', settlement: { mode: 'checkout' } } })));
    expect(out.body).toMatchObject({ success: true, settled: true, checkoutSummary: { grossAmount: 10650, advanceCredited: 9000, finalBilledAmount: 1650 } });
    expect(db.tables.rooms[0].status).toBe('CLEANING');
  });

  it('the desk checks in a walk-in and takes the room payment at once; the guest then owes nothing', async () => {
    const { PATCH } = await import('@/app/api/host/accommodations/rooms/[id]/status/route');
    const res = await json(await PATCH(req('/api/host/accommodations/rooms/room-3/status', { method: 'PATCH', body: { action: 'check-in', guest_name: 'Walk In', guest_phone: '9000000009', id_type: 'Aadhaar', id_number: '9', total_guests: 1, check_in_time: '2026-10-21T08:00:00.000Z', check_out_time: '2026-10-23T05:30:00.000Z' } }), idParams('room-3')));
    expect(res.status).toBe(200);
    const { POST: pay } = await import('@/app/api/host/accommodations/rooms/[id]/payment/route');
    const quote = await json(await pay(req('/api/host/accommodations/rooms/room-3/payment', { method: 'POST', body: { action: 'preview' } }), idParams('room-3')));
    expect(quote.body.quote.amount).toBe(7000); // two nights booked, billed as booked
    const taken = await json(await pay(req('/api/host/accommodations/rooms/room-3/payment', { method: 'POST', body: { action: 'record', payment_method: 'UPI', payment_reference: '412345678901', purpose: 'stay' } }), idParams('room-3')));
    expect(taken.body).toMatchObject({ success: true, amount: 7000, balance: 0 });
    expect(db.tables.orders.find((o: any) => o.order_type === 'room_advance')).toMatchObject({ room_id: 'room-3', payment_method: 'UPI', status: 'SETTLED' });
    const { GET: dossier } = await import('@/app/api/host/accommodations/rooms/[id]/dossier/route');
    expect((await json(await dossier(req('/api/host/accommodations/rooms/room-3/dossier'), idParams('room-3')))).body.billingSummary).toMatchObject({ advancePaid: 7000, grandTotalPayable: 0 });
  });
});

describe('one Vibers ID, end to end', () => {
  it('reserve signed in, pay, check in, order under the handle, settle from the till: cashback, the stay and the bill all land on the account', async () => {
    const { GUEST_SESSION_COOKIE, hashSessionToken } = await import('@/lib/auth/guest-auth');
    // A session token the cookie reader accepts: base64url, at least 20 characters, as newSessionToken() makes them.
    const guestToken = 'asha-test-session-token-0123456789';
    const guestCookie = `${GUEST_SESSION_COOKIE}=${guestToken}`;
    db.tables.guest_accounts.push({ id: 'acc-1', business_id: BIZ, handle: '@asha', display_name: 'Asha Rao', phone: '9876543210', user_id: 'user-1', avatar: '☕', photo_path: null, traveller_type: null, intro: null, pin_hash: null, pin_salt: null, failed_attempts: 0, locked_until: null });
    db.tables.guest_auth_sessions.push({ account_id: 'acc-1', business_id: BIZ, token_hash: hashSessionToken(guestToken), expires_at: '2027-01-01T00:00:00Z' });

    // 1. The guest reserves while signed in: no name or number typed, the account fills them, the booking is theirs.
    const { POST: book } = await import('@/app/api/guest/stay/book/route');
    const r = await json(await book(req('/api/guest/stay/book', { method: 'POST', cookie: guestCookie, body: { venue: BIZ, category_id: CAT, check_in: '2026-10-21', check_out: '2026-10-23', guests: 2 } })));
    expect(r.status).toBe(201);
    expect(r.body.booking).toMatchObject({ guest_name: 'Asha Rao', linked_to_account: true });
    expect(db.tables.stay_booking_requests[0]).toMatchObject({ guest_account_id: 'acc-1', guest_phone: '9876543210' });

    // 2. The desk bills the room: the advance invoice is the guest's.
    const paid = await bill(bookingId());
    expect(paid.status).toBe(201);
    expect(db.tables.orders.find((o: any) => o.order_type === 'room_advance')).toMatchObject({ guest_handle: '@asha', status: 'SETTLED' });

    // 3. Self check-in, then the room page and the Stay hub both know whose room it is.
    const stay = await checkIn(tokenOf(paid.body.pass.link));
    const roomCookie = String(stay.headers.get('set-cookie')).split(';')[0];
    const code = stay.body.room_code as string;
    const { GET: mine } = await import('@/app/api/guest/stay/mine/route');
    const hub = await json(await mine(req(`/api/guest/stay/mine?venue_id=${BIZ}`, { cookie: `${guestCookie}; ${roomCookie}` })));
    expect(hub.body).toMatchObject({ signed_in: true, my_room: { code, room_number: 'suite1' }, stays: [expect.objectContaining({ code: db.tables.stay_booking_requests[0].confirmation_code, state: 'in_house' })] });

    // 4. Food to the room, every dish under the guest's handle (what the room order route writes through request-identity).
    db.tables.orders.push({ id: 'o1', business_id: BIZ, room_id: 'room-1', order_type: 'room_service', status: 'pending', subtotal: 150, grand_total: 150, items: [{ id: 'burger', name: 'Veg Cheese Burger', price: 150, qty: 1 }], created_at: '2026-10-21T13:00:00Z' });
    db.tables.order_items.push({ id: 'oi1', order_id: 'o1', guest_handle: '@asha', item_name: 'Veg Cheese Burger', price: 150, quantity: 1 });

    // 5. Two days on, the till settles the room bill with "check out & settle" chosen on the receipt: it is the checkout.
    vi.setSystemTime(D('2026-10-23T04:00:00Z'));
    const { POST: createOrder } = await import('@/app/api/host/orders/create/route');
    const settled = await json(await createOrder(req('/api/host/orders/create', { method: 'POST', body: { roomId: 'room-1', tableNumber: 'ROOM suite1', paymentMethod: 'UPI', items: [], subtotal: 150, grandTotal: 150, settlement: { session_id: null, credit_cashback: true, mode: 'checkout' } } })));
    expect(settled.status).toBe(200);
    expect(settled.body).toMatchObject({ success: true, settled: true, checkoutSummary: { ordersTotal: 150, cashbackCredited: 10.5 } });
    const invoiceId = settled.body.order.id as string;
    expect(db.tables.rooms[0].status).toBe('CLEANING');
    expect(db.tables.orders.find((o: any) => o.id === 'o1')?.status).toBe('SETTLED');
    expect(db.tables.orders.find((o: any) => o.id === invoiceId)).toMatchObject({ status: 'SETTLED', guest_handle: '@asha', payment_method: 'UPI' });
    expect(db.tables.guest_wallets[0]).toMatchObject({ guest_id: '@asha', balance: 10.5 });
    expect(db.tables.wallet_transactions[0]).toMatchObject({ order_id: invoiceId, amount: 10.5, table_number: 'ROOM suite1' });
    // Settling again does nothing twice, whichever the receipt asks for: the room has no guest in it.
    expect((await json(await createOrder(req('/api/host/orders/create', { method: 'POST', body: { roomId: 'room-1', paymentMethod: 'UPI', settlement: { mode: 'checkout' } } })))).status).toBe(409);
    expect((await json(await createOrder(req('/api/host/orders/create', { method: 'POST', body: { roomId: 'room-1', paymentMethod: 'UPI', grandTotal: 150, settlement: {} } })))).status).toBe(409);
    expect(db.tables.wallet_transactions).toHaveLength(1);

    // 6. On the account: the stay reads "Stayed", and the room bill is among the guest's invoices with its cashback.
    const after = await json(await mine(req(`/api/guest/stay/mine?venue_id=${BIZ}&scope=all`, { cookie: guestCookie })));
    expect(after.body.stays[0]).toMatchObject({ state: 'stayed', venue: { id: BIZ } }); // the fake cannot join the venue's name; Postgres does
    const { queryGuestInvoices } = await import('@/lib/services/guest-auth/guest-bills.service');
    const bills = await queryGuestInvoices(db, ['@asha'], { venueId: null, from: null, to: null, payment: 'ALL', orderId: null, before: null, limit: 20 });
    const ids = bills.invoices.map((i) => i.id);
    expect(ids).toContain(invoiceId);
    expect(ids).not.toContain('o1'); // the dishes are inside the room invoice, not a second bill beside it
    expect(bills.invoices.find((i) => i.id === invoiceId)).toMatchObject({ cashback: 10.5, table_number: 'ROOM suite1' });
  });
});

describe('the desk reserves for a guest', () => {
  it('books at the desk, refuses an overbooked night, and the room is then held', async () => {
    db = seed(1);
    const { POST } = await import('@/app/api/host/accommodations/bookings/route');
    const make = async (name: string, phone: string) => json(await POST(req('/api/host/accommodations/bookings', { method: 'POST', body: { category_id: CAT, guest_name: name, guest_phone: phone, check_in: '2026-10-21', check_out: '2026-10-22', guests: 1 } })));
    expect((await make('Phone Guest', '9000000001')).status).toBe(201);
    expect(db.tables.stay_booking_requests[0]).toMatchObject({ source: 'desk', status: 'confirmed' });
    expect((await make('Too Late', '9000000002')).status).toBe(409); // the only room is taken for that night
    expect(db.tables.stay_booking_requests).toHaveLength(1);
    const { assignReservedRooms } = await import('./reservation-overlay');
    expect(Array.from(assignReservedRooms(db.tables.rooms as any, db.tables.stay_booking_requests as any, '2026-10-21').keys())).toEqual(['room-1']);
  });
});

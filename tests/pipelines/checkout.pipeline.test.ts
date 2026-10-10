import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSupabase, type FakeSupabase } from '@/lib/testing/fake-supabase';

const ctx = vi.hoisted(() => ({ db: null as any }));
const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const ROOM = 'bbbbbbbb-1111-4222-8333-444444444444';

vi.mock('@/lib/auth/guards', () => ({
  requireHost: async () => ({ error: null, businessId: BIZ, supabase: ctx.db, user: { id: 'host-1' } }),
  adminDb: () => ctx.db,
}));
// The platform fee has its own tests; here we only care that checkout asks for it once.
const feeSpy = vi.hoisted(() => vi.fn(async () => ({ allowed: true, cost: 10 })));
vi.mock('@/lib/services/wallet/fee-guard.service', () => ({
  evaluateFeeGuard: feeSpy,
  invoiceRefFromId: (id: string) => `QC-TEST-${id.slice(0, 8)}`,
  generateInvoiceRef: () => 'QC-TEST-GEN',
}));

import { POST } from '@/app/api/host/accommodations/rooms/[id]/checkout/route';

const checkout = (body: unknown = {}) =>
  POST(
    new Request(`http://localhost/api/host/accommodations/rooms/${ROOM}/checkout`, { method: 'POST', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: ROOM }) }
  );

// Nights are counted by India-time calendar date, so check in at noon IST two dates ago: two nights.
const noonIstDaysAgo = (d: number) => {
  const ist = new Date(Date.now() + 330 * 60_000 - d * 86_400_000).toISOString().slice(0, 10);
  return new Date(`${ist}T12:00:00+05:30`).toISOString();
};

function seed(extra: Parameters<typeof createFakeSupabase>[1] = {}): FakeSupabase {
  return createFakeSupabase(
    {
      rooms: [
        {
          id: ROOM, business_id: BIZ, room_number: '101', status: 'OCCUPIED',
          guest_name: 'Asha', guest_phone: '9876543210', check_in_time: noonIstDaysAgo(2), selected_addons: [],
          // the real query joins room_categories; the fake has no joins, so the category is inlined
          category: { id: 'cat-1', name: 'Deluxe', price: 3000 },
        },
      ],
      orders: [
        {
          id: 'order-fnb-1', business_id: BIZ, room_id: ROOM, order_type: 'pos', status: 'active',
          grand_total: 500, items: [{ name: 'Tea', price: 500, qty: 1 }],
        },
      ],
      room_stay_logs: [],
    },
    extra
  );
}

const rooms = () => ctx.db.tables.rooms[0];
const master = () => ctx.db.tables.orders.find((o: any) => o.order_type === 'room_stay');
const fnb = () => ctx.db.tables.orders.find((o: any) => o.id === 'order-fnb-1');

describe('Room checkout pipeline (state transitions + settlement)', () => {
  beforeEach(() => {
    feeSpy.mockClear();
    ctx.db = seed();
  });

  it('step 1 (no tender): writes the invoice, links room service, releases the room, charges the fee once', async () => {
    const res = await checkout({});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    // checked in two dates ago = 2 nights x 3000 + 500 room service
    expect(master()).toMatchObject({ status: 'ready_for_settlement', grand_total: 6500, table_number: 'ROOM 101' });
    expect(fnb()).toMatchObject({ status: 'SETTLED', master_order_id: master().id });
    expect(rooms()).toMatchObject({ status: 'CLEANING', guest_name: null, guest_phone: null });
    expect(ctx.db.tables.room_stay_logs).toHaveLength(1);
    expect(feeSpy).toHaveBeenCalledTimes(1);
  });

  it('a double-submit of step 1 is rejected and creates no second invoice or fee', async () => {
    await checkout({});
    const again = await checkout({});

    expect(again.status).toBe(409);
    expect(ctx.db.tables.orders.filter((o: any) => o.order_type === 'room_stay')).toHaveLength(1);
    expect(feeSpy).toHaveBeenCalledTimes(1);
  });

  it('two simultaneous checkouts: exactly one wins, one invoice remains, the fee is charged once', async () => {
    const [a, b] = await Promise.all([checkout({}), checkout({})]);

    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const invoices = ctx.db.tables.orders.filter((o: any) => o.order_type === 'room_stay');
    expect(invoices).toHaveLength(1);
    expect(invoices[0].status).toBe('ready_for_settlement');
    expect(fnb().master_order_id).toBe(invoices[0].id);
    expect(feeSpy).toHaveBeenCalledTimes(1);
    expect(rooms().status).toBe('CLEANING');
  });

  it('step 2 (payment modal): settles the pending invoice with the tender, exactly once', async () => {
    await checkout({});
    const pay = await checkout({ payment_method: 'upi', final_amount: 6500 });
    const body = await pay.json();

    expect(pay.status).toBe(200);
    expect(body.settled_pending_invoice).toBe(true);
    expect(master()).toMatchObject({ status: 'SETTLED', payment_method: 'UPI' });
    expect(feeSpy).toHaveBeenCalledTimes(1); // not charged again on settlement

    const payAgain = await checkout({ payment_method: 'CASH' });
    expect(payAgain.status).toBe(409);
    expect(master().payment_method).toBe('UPI');
  });

  it('a payment call with nothing pending is rejected', async () => {
    ctx.db.tables.rooms[0].status = 'VACANT';
    const res = await checkout({ payment_method: 'CASH' });
    expect(res.status).toBe(409);
  });

  it('single call with a tender on an occupied room releases and settles together', async () => {
    const res = await checkout({ payment_method: 'CARD' });
    expect(res.status).toBe(200);
    expect(master()).toMatchObject({ status: 'SETTLED', payment_method: 'CARD', grand_total: 6500 });
    expect(rooms().status).toBe('CLEANING');
  });

  it('an early checkout bills the nights stayed, not the booked folio (add-ons included)', async () => {
    // Booked 4 nights at check-in (folio 12000 + breakfast for 2 x 4 nights); leaving after 2.
    ctx.db.tables.rooms[0].selected_addons = [{ id: 'a2', name: 'Breakfast', price: 350, billingType: 'per_person_per_day', persons: 2 }];
    ctx.db.tables.orders.push({
      id: 'folio-1', business_id: BIZ, room_id: ROOM, order_type: 'room_stay', status: 'active',
      grand_total: 14800, created_at: ctx.db.tables.rooms[0].check_in_time, items: [],
    });
    const res = await checkout({});
    expect(res.status).toBe(200);
    // 2 nights x 3000 + breakfast 350 x 2 nights x 2 people + 500 room service
    expect(ctx.db.tables.orders.find((o: any) => o.id === 'folio-1')).toMatchObject({ status: 'ready_for_settlement', grand_total: 7900 });
    expect(ctx.db.tables.orders.filter((o: any) => o.order_type === 'room_stay')).toHaveLength(1);
  });

  it('rejects an unknown tender before touching any data', async () => {
    const res = await checkout({ payment_method: 'BITCOIN' });
    expect(res.status).toBe(400);
    expect(rooms().status).toBe('OCCUPIED');
    expect(master()).toBeUndefined();
  });

  it('if the invoice cannot be saved, the guest and room are left untouched so the host can retry', async () => {
    ctx.db = seed({ failOn: { 'orders.insert': () => true } });
    const res = await checkout({});

    expect(res.status).toBe(500);
    expect(rooms()).toMatchObject({ status: 'OCCUPIED', guest_name: 'Asha' });
    expect(fnb().status).toBe('active');
    expect(feeSpy).not.toHaveBeenCalled();

    // the retry succeeds once the database recovers
    ctx.db = seed();
    expect((await checkout({})).status).toBe(200);
  });

  it('if releasing the room fails after the invoice is written, nothing is settled and a retry reuses the invoice', async () => {
    ctx.db = seed({ failOn: { 'rooms.update': () => true } });
    const res = await checkout({});

    expect(res.status).toBe(500);
    expect(master().status).toBe('ready_for_settlement');
    expect(fnb().status).toBe('active'); // not settled: still part of the open bill
    expect(rooms().status).toBe('OCCUPIED');
    expect(feeSpy).not.toHaveBeenCalled();
  });
});

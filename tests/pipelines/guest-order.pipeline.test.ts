import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeSupabase } from '@/lib/testing/fake-supabase';

const ctx = vi.hoisted(() => ({ db: null as any }));
vi.mock('@/lib/supabase/admin', () => ({ adminDb: () => ctx.db, getAdminClient: () => ctx.db }));

import { POST } from '@/app/api/guest/order/route';

// The order, order_items, kitchen ticket and table-session writes happen inside the Postgres
// function submit_guest_order_atomic. That function's SQL cannot run here, so it is stubbed and
// these tests cover everything around it: the guards in front, and the contract with it.
const BIZ = 'aaaaaaaa-1111-4222-8333-444444444444';
const OTHER_BIZ = 'cccccccc-1111-4222-8333-444444444444';
const COFFEE = '0b0f2f1e-2d3c-4b5a-8c7d-9e0f1a2b3c4d';
const FOREIGN_ITEM = '1c1f3f2e-3e4d-4c6b-9d8e-0f1a2b3c4d5e';
const SOLD_OUT = '2d2e4f3a-4f5e-4d7c-8e9f-1a2b3c4d5e6f';

let seq = 0;
const unique = () => `k${Date.now()}-${seq++}`;

function newDb(opts: { balance?: number; subscription?: string; rpc?: (a: any) => any; failOn?: any; orders?: any[] } = {}) {
  return createFakeSupabase(
    {
      businesses: [{ id: BIZ, business_name: 'Venus Cafe' }],
      venue_wallets: [{ venue_id: BIZ, balance: opts.balance ?? 500, currency: 'INR' }],
      venue_subscriptions: [{ venue_id: BIZ, status: opts.subscription ?? 'active', plan_tier: 'pay_as_you_go' }],
      catalog_items: [
        { id: COFFEE, business_id: BIZ, name: 'Cold Coffee', price: 150 },
        { id: FOREIGN_ITEM, business_id: OTHER_BIZ, name: 'Foreign Dish', price: 999 },
        { id: SOLD_OUT, business_id: BIZ, name: 'Paneer Tikka', price: 220, is_available: false },
      ],
      orders: opts.orders ?? [],
      order_items: [],
    },
    {
      failOn: opts.failOn,
      rpc: {
        submit_guest_order_atomic: opts.rpc ?? ((a: any) => ({ success: true, order_id: a.p_order_id, ticket_number: a.p_ticket_number })),
      },
    }
  );
}

const order = (body: Record<string, unknown>, ip = '203.0.113.7') =>
  POST(
    new Request(`http://localhost/api/guest/order?cafe_id=${BIZ}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ table_number: 'T-04', idempotency_key: unique(), items: [{ item_id: COFFEE, quantity: 2 }], ...body }),
    })
  );

let ipCounter = 10;
const freshIp = () => `198.51.100.${ipCounter++}`;

describe('Guest order pipeline (guards in front of the atomic order function)', () => {
  beforeEach(() => {
    ctx.db = newDb();
  });

  it('places an order and returns the KOT details the guest UI reads at the top level', async () => {
    const res = await order({}, freshIp());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ success: true, is_addon: false, kot_status: 'PENDING' });
    expect(json.ticket_number).toMatch(/^KOT-\d{4}$/);
    expect(json.order.items).toBeTruthy();
    expect(ctx.db.calls.rpc.map((c: any) => c.name)).toEqual(['submit_guest_order_atomic']);
  });

  it('rejects a dish the host has switched off since the guest loaded the menu, and sends nothing to the kitchen', async () => {
    const res = await order({ items: [{ item_id: COFFEE, quantity: 1 }, { item_id: SOLD_OUT, quantity: 1 }] }, freshIp());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(JSON.stringify(json)).toContain('Paneer Tikka');
    expect(ctx.db.calls.rpc).toHaveLength(0);
  });
  it('never stamps a guest onto the shared table session, and a guest without a sign-in owns no dish', async () => {
    await order({ guest_handle: '@reshav' }, freshIp());
    const args = ctx.db.calls.rpc[0].args;
    expect(args.p_guest_handle).toBeNull();
    expect(args.p_order_items.every((it: any) => it.guest_handle === null)).toBe(true);
  });

  it('ignores client prices: totals come from the catalog, and quantity is clamped', async () => {
    await order({ items: [{ item_id: COFFEE, quantity: 99, price: 1, total_item_price: 1 }] }, freshIp());
    const args = ctx.db.calls.rpc[0].args;

    expect(args.p_order_items).toEqual([expect.objectContaining({ item_id: COFFEE, price: 150, quantity: 50 })]);
    expect(args.p_subtotal).toBe(150 * 50);
    expect(args.p_business_id).toBe(BIZ);
  });

  it("an item from another venue's catalog gets no price (cannot borrow another tenant's menu)", async () => {
    await order({ items: [{ item_id: FOREIGN_ITEM, quantity: 1, price: 999 }] }, freshIp());
    expect(ctx.db.calls.rpc[0].args.p_order_items[0].price).toBe(0);
  });

  it('rejects a malformed table or an empty basket before touching the order function', async () => {
    expect((await order({ table_number: 'T-04; DROP' }, freshIp())).status).toBe(400);
    expect((await order({ items: [] }, freshIp())).status).toBe(400);
    expect(ctx.db.calls.rpc).toHaveLength(0);
  });

  it('blocks ordering at a venue with a negative wallet (402) and never calls the order function', async () => {
    ctx.db = newDb({ balance: -20 });
    const res = await order({}, freshIp());
    const json = await res.json();

    expect(res.status).toBe(402);
    expect(json.code).toBe('venue_suspended');
    expect(ctx.db.calls.rpc).toHaveLength(0);
  });

  it('blocks ordering when the subscription is not active', async () => {
    ctx.db = newDb({ subscription: 'expired' });
    expect((await order({}, freshIp())).status).toBe(402);
    expect(ctx.db.calls.rpc).toHaveLength(0);
  });

  it('fails closed (503) when the billing state cannot be read', async () => {
    ctx.db = newDb({ failOn: { 'venue_wallets.select': () => true } });
    const res = await order({}, freshIp());

    expect(res.status).toBe(503);
    expect(ctx.db.calls.rpc).toHaveLength(0);
  });

  it('rate-limits a flood from one address at one venue (40 per minute), without blocking others', async () => {
    const ip = freshIp();
    const statuses: number[] = [];
    for (let i = 0; i < 41; i++) statuses.push((await order({}, ip)).status);

    expect(statuses.slice(0, 40).every((s) => s === 200)).toBe(true);
    expect(statuses[40]).toBe(429);

    expect((await order({}, freshIp())).status).toBe(200);
  });

  it('a retry with the same idempotency key returns the original order and does not create another', async () => {
    ctx.db = newDb({
      orders: [{ id: 'ord-original', business_id: BIZ, idempotency_key: 'retry-1', status: 'open', ticket_number: 'KOT-1234', items: [] }],
    });
    const res = await order({ idempotency_key: 'retry-1' }, freshIp());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ is_duplicate: true, order_id: 'ord-original' });
    expect(ctx.db.calls.rpc).toHaveLength(0);
  });

  it('maps a rejected order (function returns success:false) to 409 and an unexpected error to a generic 500', async () => {
    ctx.db = newDb({ rpc: () => ({ success: false, error: 'table is closed' }) });
    const rejected = await order({}, freshIp());
    expect(rejected.status).toBe(409);

    ctx.db = newDb({ rpc: () => { throw new Error('deadlock detected: internal detail'); } });
    const crashed = await order({}, freshIp());
    const body = await crashed.json();
    expect(crashed.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('deadlock');
  });

  it('an add-on to an open table order is flagged as an add-on', async () => {
    ctx.db = newDb({
      orders: [{ id: '2d2e4f3a-4f5e-4d7c-8e9f-1a2b3c4d5e6f', business_id: BIZ, table_number: 'T-04', status: 'open', items: [], created_at: new Date().toISOString() }],
    });
    const json = await (await order({}, freshIp())).json();

    expect(json.is_addon).toBe(true);
    expect(json.ticket_number).toMatch(/-ADD$/);
    expect(ctx.db.calls.rpc[0].args.p_is_addon).toBe(true);
  });
});

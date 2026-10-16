/**
 * Live delivery test: a guest orders for delivery through the real menu routes, and the order reaches the kitchen, the
 * host's billing and the host's delivery board, then moves through every stage to delivered.
 *
 * The route handlers run in this process against the database in .env.local (the same code the server runs). This
 * avoids depending on a running server: a `next start` on port 3000 serves whatever build it was started with.
 * It writes real rows, so it is OFF unless E2E_LIVE=1. Everything it creates belongs to one disposable venue
 * ("ZZ E2E Delivery Venue"), and every row of that venue is removed at the end. The database must already have
 * supabase/migrations/20261016000012_guest_delivery.sql.
 *
 *   $env:E2E_LIVE='1'; npx vitest run --config vitest.e2e.config.ts tests/e2e/delivery-order.e2e.test.ts
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { cleanUp, liveEnv } from './support';
import { getActiveHostSessions } from '@/lib/services/session/active-sessions.service';
import { listDeliveryOrders, updateDeliveryOrder, getGuestDeliveryStatus } from '@/lib/services/delivery/delivery-orders.service';
import { DELIVERY_TABLE_PREFIX } from '@/lib/services/delivery/delivery-input';

const LIVE = process.env.E2E_LIVE === '1';
const ENV = liveEnv();

// Bengaluru: the venue, a guest about 2 km north (inside a 5 km radius), and one about 22 km north (outside it).
const VENUE = { lat: 12.9716, lng: 77.5946 };
const NEAR = { lat: VENUE.lat + 0.018, lng: VENUE.lng };
const FAR = { lat: VENUE.lat + 0.2, lng: VENUE.lng };
const TERMS = { enabled: true, radiusKm: 5, minOrder: 100, fee: 30, venueLat: VENUE.lat, venueLng: VENUE.lng };
const DISH = { name: 'ZZ E2E Paneer Wrap', price: 250 };
// The server prices every line from the catalog, so a below-minimum order needs a dish that is cheap in the catalog.
const CHEAP = { name: 'ZZ E2E Chai', price: 60 };

type Routes = {
  placeOrder: (req: Request) => Promise<Response>;
  deliveryInfo: (req: Request) => Promise<Response>;
  guestDelivery: (req: Request) => Promise<Response>;
};

describe.skipIf(!LIVE)('Delivery: guest order to kitchen, billing and the delivery board', () => {
  const db = createClient(ENV.NEXT_PUBLIC_SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const state: { biz: string; dishId: string; cheapId: string; orderId: string; table: string; grandTotal: number } = { biz: '', dishId: '', cheapId: '', orderId: '', table: '', grandTotal: 0 };
  let routes: Routes;
  const ip = `10.42.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

  /** Calls a route handler the way Next does: a Request in, a Response out. */
  async function invoke(handler: (req: Request) => Promise<Response>, path: string, body?: unknown) {
    const req = new Request(`http://localhost${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const res = await handler(req);
    return { status: res.status, json: await res.json().catch(() => null) as any };
  }

  const deliveryBody = (location: { lat: number; lng: number }, dishId = state.dishId, qty = 1) => ({
    order_type: 'delivery',
    business_id: state.biz,
    cafe_id: state.biz,
    guest_name: 'ZZ E2E Guest',
    items: [{ id: dishId, item_id: dishId, name: DISH.name, price: DISH.price, quantity: qty }],
    idempotency_key: `e2e-dl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    delivery: { address: '42 Test Street, Indiranagar, Bengaluru', phone: '9876543210', lat: location.lat, lng: location.lng, payment: 'upi' },
    table_note: 'Ring the bell',
  });

  beforeAll(async () => {
    // The route modules read their keys from process.env, so the .env.local values are copied in first.
    for (const [k, v] of Object.entries(ENV)) if (process.env[k] === undefined) process.env[k] = v;
    const [order, info, status] = await Promise.all([
      import('@/app/api/guest/order/route'),
      import('@/app/api/guest/delivery-info/route'),
      import('@/app/api/guest/delivery/route'),
    ]);
    routes = { placeOrder: order.POST, deliveryInfo: info.GET, guestDelivery: status.GET };

    const slug = `zz-e2e-delivery-${Date.now().toString(36)}`;
    const { data: b, error } = await db.from('businesses').insert({
      business_name: 'ZZ E2E Delivery Venue', name: 'ZZ E2E Delivery Venue', slug, categories: ['Cafe'], upi_id: 'e2e-test@upi',
      delivery_enabled: TERMS.enabled, delivery_radius_km: TERMS.radiusKm, delivery_min_order: TERMS.minOrder, delivery_fee: TERMS.fee,
      delivery_lat: TERMS.venueLat, delivery_lng: TERMS.venueLng,
    }).select('id').single();
    if (error) throw new Error(`could not create the test venue: ${error.message}`);
    state.biz = b.id;

    const dish = await db.from('catalog_items').insert({
      business_id: state.biz, name: DISH.name, price: DISH.price, category: 'Main Course', item_type: 'food', is_available: true,
    }).select('id').single();
    if (dish.error) throw new Error(`menu item: ${dish.error.message}`);
    state.dishId = dish.data.id;

    const cheap = await db.from('catalog_items').insert({
      business_id: state.biz, name: CHEAP.name, price: CHEAP.price, category: 'Beverages', item_type: 'food', is_available: true,
    }).select('id').single();
    if (cheap.error) throw new Error(`menu item: ${cheap.error.message}`);
    state.cheapId = cheap.data.id;
  }, 60_000);

  afterAll(async () => {
    await cleanUp(db, ENV, state.biz);
  }, 120_000);

  it('the venue publishes its delivery terms to the guest cart', async () => {
    const res = await invoke(routes.deliveryInfo, `/api/guest/delivery-info?cafe_id=${state.biz}`);
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ enabled: true, radius_km: 5, min_order: 100, fee: 30, upi_id: 'e2e-test@upi' });
  });

  it('refuses an address outside the radius, with a 422 that names the rule', async () => {
    const res = await invoke(routes.placeOrder, '/api/guest/order', deliveryBody(FAR));
    expect(res.status).toBe(422);
    expect(res.json.code).toBe('DELIVERY_OUT_OF_RANGE');
  });

  it('refuses an order below the minimum, and writes nothing', async () => {
    const res = await invoke(routes.placeOrder, '/api/guest/order', deliveryBody(NEAR, state.cheapId));
    expect(res.status).toBe(422);
    expect(res.json.code).toBe('DELIVERY_BELOW_MINIMUM');
    const { count } = await db.from('orders').select('*', { count: 'exact', head: true }).eq('business_id', state.biz);
    expect(count).toBe(0);
  });

  it('places an in-range order: the fee is the venue fee, and the bill has its own DLV table', async () => {
    const res = await invoke(routes.placeOrder, '/api/guest/order', deliveryBody(NEAR, state.dishId, 2));
    expect(res.status).toBe(200);
    expect(res.json.success).toBe(true);
    state.orderId = res.json.order_id;
    state.grandTotal = Number(res.json.grand_total);
    expect(state.orderId).toMatch(/^[0-9a-f-]{36}$/i);
    // 2 dishes at ₹250 plus the ₹30 fee. Taxes, if the venue charges any, sit inside grand_total before the fee.
    expect(state.grandTotal).toBeGreaterThanOrEqual(530);
  });

  it('stores the delivery on the order row', async () => {
    const { data, error } = await db.from('orders').select('*').eq('id', state.orderId).single();
    expect(error).toBeNull();
    state.table = data.table_number;
    expect(state.table.startsWith(DELIVERY_TABLE_PREFIX)).toBe(true);
    expect(data).toMatchObject({
      is_delivery: true, delivery_address: '42 Test Street, Indiranagar, Bengaluru', delivery_phone: '9876543210',
      delivery_payment: 'upi_advance', delivery_paid: false, delivery_status: 'received', delivery_fee: 30, status: 'open',
    });
    expect(Number(data.delivery_distance_km)).toBeCloseTo(2, 0);
  });

  it('reaches the kitchen: the ticket names the delivery and carries the address', async () => {
    const { data, error } = await db.from('kitchen_tickets').select('table_or_room, notes, station, status').eq('order_id', state.orderId);
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
    for (const t of data ?? []) {
      expect(t.table_or_room).toMatch(/^Delivery /);
      expect(t.notes).toContain('42 Test Street');
      expect(t.notes).toContain('Ring the bell');
    }
  });

  it('reaches billing: the host billing read shows the delivery bill with its total', async () => {
    const sessions = await getActiveHostSessions(db, state.biz);
    const bill = sessions.sessions[state.table];
    expect(bill).toBeDefined();
    expect(Number(bill.grandTotal)).toBeCloseTo(state.grandTotal, 2);
  });

  it('shows on the delivery board, and walks through every stage', async () => {
    const board = await listDeliveryOrders(db, state.biz);
    expect(board.map((o: any) => o.id)).toContain(state.orderId);

    expect((await updateDeliveryOrder(db, state.biz, state.orderId, { status: 'preparing' })).ok).toBe(true);
    expect((await updateDeliveryOrder(db, state.biz, state.orderId, { status: 'received' }))).toMatchObject({ ok: false, status: 409 });
    expect((await updateDeliveryOrder(db, state.biz, state.orderId, { paid: true })).ok).toBe(true);
    expect((await updateDeliveryOrder(db, state.biz, state.orderId, { status: 'out_for_delivery' })).ok).toBe(true);
    expect((await updateDeliveryOrder(db, state.biz, state.orderId, { status: 'delivered' })).ok).toBe(true);
    expect((await updateDeliveryOrder(db, state.biz, state.orderId, { status: 'preparing' }))).toMatchObject({ ok: false, status: 409 });
  });

  it('the guest sees the stage and payment through the guest route, and never the address', async () => {
    const res = await invoke(routes.guestDelivery, `/api/guest/delivery?business_id=${state.biz}&order_id=${state.orderId}`);
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ delivery_status: 'delivered', delivery_paid: true, delivery_payment: 'upi_advance' });
    expect(JSON.stringify(res.json)).not.toContain('42 Test Street');
    expect(await getGuestDeliveryStatus(db, state.biz, state.orderId)).toMatchObject({ delivery_status: 'delivered' });
  });
});

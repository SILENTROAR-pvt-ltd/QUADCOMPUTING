/**
 * A-to-Z live test: a guest scans a table QR, orders, the kitchen cooks, waiters add and serve, the guest asks for the bill,
 * the cashier settles it, with real staff PIN logins, real websockets and a lunch-rush in the middle.
 *
 * It runs against a running server (default http://localhost:3000) and the database that server uses, and writes real
 * rows, so it is OFF unless E2E_LIVE=1. Everything it creates belongs to one disposable venue
 * ("ZZ E2E Test Venue"), and every row it created is deleted at the end.
 *
 *   $env:E2E_LIVE='1'; npx vitest run tests/e2e/a-to-z.e2e.test.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { hashStaffPin } from '@/lib/services/staff-auth/staff-login.service';
import { guestTableChannel } from '@/lib/realtime/channels';

const LIVE = process.env.E2E_LIVE === '1';
const BASE = (process.env.E2E_BASE || 'http://localhost:3000').replace(/\/$/, '');
const RUSH_GUESTS = Number(process.env.E2E_RUSH_GUESTS || 24);

function envFile(): Record<string, string> {
  try {
    return Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
      .filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]));
  } catch { return {}; }
}
const ENV = { ...envFile(), ...process.env } as Record<string, string>;

interface Res { status: number; json: any; ms: number; setCookie: string[] }
async function call(path: string, o: { method?: string; body?: unknown; cookie?: string; ip?: string } = {}): Promise<Res> {
  const t = performance.now();
  const res = await fetch(`${BASE}${path}`, {
    method: o.method || 'GET',
    headers: { 'content-type': 'application/json', ...(o.cookie ? { cookie: o.cookie } : {}), ...(o.ip ? { 'x-forwarded-for': o.ip } : {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json, ms: performance.now() - t, setCookie: (res.headers as any).getSetCookie?.() ?? [] };
}
const pct = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] ?? 0; };
const ip = (n: number) => `10.9.${(n >> 8) & 255}.${n & 255}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const report: Array<{ step: string; ok: boolean; ms?: number; note?: string }> = [];
const note = (step: string, ok: boolean, ms?: number, text?: string) => report.push({ step, ok, ms, note: text });

describe.skipIf(!LIVE)('A to Z: QR scan to final bill, staff PIN, websockets, rush', () => {
  const db = createClient(ENV.NEXT_PUBLIC_SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const anon = createClient(ENV.NEXT_PUBLIC_SUPABASE_URL, ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const state: any = { items: [], staff: {}, cookies: {}, settled: [] as any[], floorPings: 0, kotEvents: 0 };
  const channels: any[] = [];
  let biz = '';

  beforeAll(async () => {
    const slug = `zz-e2e-${Date.now().toString(36)}`;
    const { data: b, error } = await db.from('businesses').insert({ business_name: 'ZZ E2E Test Venue', name: 'ZZ E2E Test Venue', slug, categories: ['Cafe'] }).select('id').single();
    if (error) throw new Error(`could not create the test venue: ${error.message}`);
    biz = b.id;

    for (const n of ['T-01', 'T-02', 'T-03']) {
      const r = await db.from('restaurant_tables').insert({ business_id: biz, table_number: n, seating_capacity: 4, status: 'VACANT', is_active: true });
      if (r.error) throw new Error(`table ${n}: ${r.error.message}`);
    }
    const menu = [['Paneer Tikka', 240], ['Dal Makhani', 180], ['Masala Chai', 40]] as const;
    for (const [name, price] of menu) {
      const r = await db.from('catalog_items').insert({ business_id: biz, name, price, category: 'Main Course', item_type: 'food', is_available: true }).select('id, name, price').single();
      if (r.error) throw new Error(`menu item ${name}: ${r.error.message}`);
      state.items.push(r.data);
    }
    for (const [role, pin] of [['WAITER', '1111'], ['CHEF', '2222'], ['CASHIER', '3333']] as const) {
      const r = await db.from('staff_profiles').insert({
        business_id: biz, name: `E2E ${role}`, role, pin_hash: await hashStaffPin(pin), is_pos_active: true,
        status: 'ACTIVE', join_date: new Date().toISOString().slice(0, 10), base_salary: 0,
      }).select('id').single();
      if (r.error) throw new Error(`staff ${role}: ${r.error.message}`);
      state.staff[role] = { id: r.data.id, pin };
    }

    // Websockets: the same two channels the apps use. A guest at T-01, and a venue's floor ping.
    const guestTopic = guestTableChannel(biz, 'T-01')!;
    const open = (topic: string, event: string, onMsg: (p: any) => void) => new Promise<boolean>((resolve) => {
      const ch = anon.channel(topic).on('broadcast', { event }, onMsg).subscribe((s: string) => { if (s === 'SUBSCRIBED') resolve(true); if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') resolve(false); });
      channels.push(ch);
      setTimeout(() => resolve(false), 8000);
    });
    state.guestSocket = await open(guestTopic, 'table_settled', (p) => state.settled.push(p));
    await open(guestTopic, 'kot_status_update', () => { state.kotEvents += 1; });
    state.floorSocket = await open(`floor_${biz}`, 'changed', () => { state.floorPings += 1; });
  }, 60_000);

  afterAll(async () => {
    for (const ch of channels) { try { await anon.removeChannel(ch); } catch { /* closing */ } }
    const cleaned = await cleanUp(db, ENV, biz);
    note('Cleanup: every row of the test venue removed', cleaned.left === 0, undefined, `${cleaned.deleted} rows deleted, ${cleaned.left} left${cleaned.stuck.length ? ` (${cleaned.stuck.join(', ')})` : ''}`);
    writeReport();
  }, 120_000);

  it('1. guest scans the QR: the menu loads', async () => {
    const r = await call(`/api/guest/menu?cafe_id=${biz}&table=T-01`, { ip: ip(1) });
    note('Guest scans QR: menu', r.status === 200 && r.json.items.length === 3, r.ms, `${r.json?.items?.length} dishes`);
    expect(r.status).toBe(200);
    expect(r.json.items).toHaveLength(3);
  });

  it('2. guest orders: order, items and kitchen ticket are created', async () => {
    const [paneer, dal] = state.items;
    await call('/api/guest/session', { method: 'POST', ip: ip(1), body: { cafe_id: biz, table_number: 'T-01' } });
    const r = await call('/api/guest/order', { method: 'POST', ip: ip(1), body: {
      cafe_id: biz, table_number: 'T-01', guest_name: 'E2E Guest', client_order_nonce: `e2e-${Date.now()}`,
      items: [{ id: paneer.id, name: paneer.name, quantity: 2 }, { id: dal.id, name: dal.name, quantity: 1 }],
    } });
    state.orderId = r.json?.order_id;
    const expected = 2 * 240 + 180;
    note('Guest places order', r.status === 200 && r.json.success, r.ms, `order ${String(state.orderId).slice(0, 8)}, subtotal ${r.json?.subtotal}`);
    expect(r.status).toBe(200);
    expect(r.json.success).toBe(true);
    expect(Number(r.json.subtotal)).toBe(expected);
  });

  it('3. staff sign in with PINs (three roles)', async () => {
    for (const role of ['WAITER', 'CHEF', 'CASHIER'] as const) {
      const r = await call('/api/auth/staff-pin', { method: 'POST', ip: ip(2), body: { business_id: biz, staff_id: state.staff[role].id, pin: state.staff[role].pin } });
      const cookie = r.setCookie.find((c) => c.startsWith('qc_staff_session='))?.split(';')[0];
      state.cookies[role] = cookie;
      note(`${role} signs in with PIN`, r.status === 200 && Boolean(cookie), r.ms, r.json?.redirect);
      expect(r.status).toBe(200);
      expect(cookie).toBeTruthy();
    }
    const wrong = await call('/api/auth/staff-pin', { method: 'POST', ip: ip(3), body: { business_id: biz, staff_id: state.staff.WAITER.id, pin: '9999' } });
    note('Wrong PIN is refused', wrong.status === 401, wrong.ms);
    expect(wrong.status).toBe(401);
  });

  it('4. kitchen sees the ticket and moves it to ready; waiter sees the table', async () => {
    const list = await call(`/api/host/kitchen/tickets?business_id=${biz}`, { cookie: state.cookies.CHEF });
    const ticket = list.json?.tickets?.find((t: any) => t.order_id === state.orderId) ?? list.json?.tickets?.[0];
    note('Chef sees the new ticket', list.status === 200 && Boolean(ticket), list.ms, `${list.json?.tickets?.length} tickets`);
    expect(ticket).toBeTruthy();
    state.ticketId = ticket.id;

    for (const status of ['PREPARING', 'READY']) {
      const r = await call('/api/host/kitchen/tickets', { method: 'PATCH', cookie: state.cookies.CHEF, body: { id: ticket.id, status, business_id: biz } });
      note(`Chef marks ${status}`, r.status === 200, r.ms);
      expect(r.status).toBe(200);
    }
    const tables = await call(`/api/host/tables?business_id=${biz}`, { cookie: state.cookies.WAITER });
    const sessions = await call(`/api/host/sessions`, { cookie: state.cookies.WAITER });
    const entry = sessions.json?.sessions?.['T-01'];
    note('Waiter sees T-01 occupied with its bill', tables.status === 200 && Number(entry?.grandTotal ?? entry?.subtotal) > 0, tables.ms + sessions.ms, `bill ${entry?.grandTotal ?? entry?.subtotal}`);
    expect(Number(entry?.grandTotal ?? entry?.subtotal)).toBeGreaterThan(0);
  });

  it('5. waiter adds an item, serves the ready order, sends the bill to billing', async () => {
    const chai = state.items[2];
    const add = await call('/api/host/tables/items', { method: 'POST', cookie: state.cookies.WAITER, body: { table_number: 'T-01', items: [{ item_id: chai.id, quantity: 2 }] } });
    note('Waiter adds items to the table', add.status === 201, add.ms);
    expect(add.status).toBe(201);

    const served = await call('/api/host/kitchen/tickets', { method: 'PATCH', cookie: state.cookies.WAITER, body: { id: state.ticketId, status: 'SERVED', business_id: biz } });
    note('Waiter marks the order served', served.status === 200, served.ms);
    expect(served.status).toBe(200);

    const bill = await call('/api/host/sessions', { method: 'PATCH', cookie: state.cookies.WAITER, body: { action: 'request_bill', table_number: 'T-01' } });
    note('Waiter sends the bill to billing', bill.status === 200 && bill.json?.success !== false, bill.ms);
    expect(bill.status).toBe(200);
  });

  it('6. role isolation: nobody reaches what is not theirs', async () => {
    const cases: Array<[string, Res]> = [
      ['Chef cannot read tables', await call(`/api/host/tables?business_id=${biz}`, { cookie: state.cookies.CHEF })],
      ['Chef cannot read sessions', await call('/api/host/sessions', { cookie: state.cookies.CHEF })],
      ['Waiter cannot open staff admin', await call('/api/host/staff/access', { cookie: state.cookies.WAITER })],
      ['Cashier cannot open staff admin', await call('/api/host/staff/access', { cookie: state.cookies.CASHIER })],
      ['Waiter cannot settle a bill', await call('/api/host/sessions', { method: 'PATCH', cookie: state.cookies.WAITER, body: { table_number: 'T-01', payment_method: 'CASH' } })],
      ['Waiter cannot self-settle (owner switch off)', await call('/api/host/sessions', { method: 'PATCH', cookie: state.cookies.WAITER, body: { action: 'waiter_settle', table_number: 'T-01', payment_method: 'CASH' } })],
      ['Forged cookie is refused', await call('/api/host/tables', { cookie: `${state.cookies.WAITER}x` })],
      ['No cookie is refused', await call('/api/host/tables')],
    ];
    for (const [name, r] of cases) {
      const refused = [401, 403].includes(r.status);
      note(name, refused, r.ms, `HTTP ${r.status}`);
      expect(refused, `${name}: HTTP ${r.status}`).toBe(true);
    }
    const other = await call(`/api/host/tables?business_id=00000000-0000-4000-8000-000000000000`, { cookie: state.cookies.WAITER });
    note('Waiter cannot read another venue', other.status === 403, other.ms, `HTTP ${other.status}`);
    expect(other.status).toBe(403);
  });

  it('7. cashier settles the bill: order settled, table freed, guest told over websocket', async () => {
    const before = await call('/api/host/sessions', { cookie: state.cookies.CASHIER });
    const entry = before.json?.sessions?.['T-01'];
    const total = Number(entry?.grandTotal ?? entry?.subtotal);
    const r = await call('/api/host/sessions', { method: 'PATCH', cookie: state.cookies.CASHIER, body: {
      table_number: 'T-01', order_id: state.orderId, payment_method: 'CASH', subtotal: total, grand_total: total, tax_amount: 0,
    } });
    note('Cashier settles the bill (cash)', r.status === 200 && r.json?.success !== false, r.ms, `total ${total}`);
    expect(r.status).toBe(200);

    const order = await db.from('orders').select('status').eq('id', state.orderId).maybeSingle();
    const table = await db.from('restaurant_tables').select('status').eq('business_id', biz).eq('table_number', 'T-01').maybeSingle();
    note('Order is settled in the database', String(order.data?.status).toLowerCase() === 'settled', undefined, String(order.data?.status));
    note('Table is vacant again', String(table.data?.status).toUpperCase() === 'VACANT', undefined, String(table.data?.status));
    expect(String(order.data?.status).toLowerCase()).toBe('settled');
    expect(String(table.data?.status).toUpperCase()).toBe('VACANT');

    await sleep(1500);
    note('Websocket: guest at the table got "table_settled"', state.settled.length > 0, undefined, state.guestSocket ? `${state.settled.length} message(s)` : 'socket did not connect');
    expect(state.settled.length).toBeGreaterThan(0);
    // The topic is public (a venue's id is in every QR link): the message must carry no amounts, ids or fees.
    const leaked = state.settled.filter((m: any) => Object.keys(m?.payload ?? m ?? {}).length > 0);
    note('Websocket: the public settlement message carries no amounts or ids', leaked.length === 0, undefined, leaked.length ? JSON.stringify(leaked[0]).slice(0, 80) : 'empty');
    expect(leaked).toHaveLength(0);
  });

  it('7b. the database itself refuses a stale "new bill" or "add to bill" decision', async () => {
    const [paneer] = state.items;
    const first = await call('/api/guest/order', { method: 'POST', ip: ip(7), body: {
      cafe_id: biz, table_number: 'T-01', guest_name: 'Second visit', client_order_nonce: `again-${Date.now()}`,
      items: [{ id: paneer.id, name: paneer.name, quantity: 1 }],
    } });
    expect(first.status).toBe(200);
    const args = {
      p_business_id: biz, p_table_number: 'T-01', p_order_id: crypto.randomUUID(), p_order_items: [], p_aggregated_items: [],
      p_subtotal: 0, p_tax_amount: 0, p_grand_total: 0, p_ticket_items: [],
    };
    // "No bill is open, make a new one" while one is open: the read the app decided from is out of date.
    const staleNew = await db.rpc('submit_guest_order_atomic', { ...args, p_is_addon: false });
    note('Database refuses a second new bill on an occupied table', /TABLE_STATE_CHANGED/.test(staleNew.error?.message || ''), undefined, staleNew.error?.message?.slice(0, 80) || 'accepted');
    // "Add to bill X as it was when I read it", when it has more items now.
    const staleAdd = await db.rpc('submit_guest_order_atomic', { ...args, p_order_id: first.json.order_id, p_is_addon: true, p_expected_item_rows: 0 });
    note('Database refuses an add-on built from an out-of-date bill', /TABLE_STATE_CHANGED/.test(staleAdd.error?.message || ''), undefined, staleAdd.error?.message?.slice(0, 80) || 'accepted');
    expect(staleNew.error?.message).toMatch(/TABLE_STATE_CHANGED/);
    expect(staleAdd.error?.message).toMatch(/TABLE_STATE_CHANGED/);

    // Leave nothing open for the later checks.
    const sessions = await call('/api/host/sessions', { cookie: state.cookies.CASHIER });
    const total = Number(sessions.json?.sessions?.['T-01']?.grandTotal ?? sessions.json?.sessions?.['T-01']?.subtotal);
    const settle = await call('/api/host/sessions', { method: 'PATCH', cookie: state.cookies.CASHIER, body: {
      table_number: 'T-01', order_id: first.json.order_id, payment_method: 'CASH', subtotal: total, grand_total: total, tax_amount: 0,
    } });
    expect(settle.status).toBe(200);
  });

  it('8. lunch rush: concurrent guests order on two tables while staff keep reading', async () => {
    const [paneer, dal, chai] = state.items;
    const dishes = [paneer, dal, chai];
    const tables = ['T-02', 'T-03'];
    const latencies = { order: [] as number[], waiterTables: [] as number[], waiterSessions: [] as number[], chefTickets: [] as number[] };
    let statuses: Record<number, number> = {};
    let running = true;

    const poll = async () => {
      while (running) {
        const [t, s, k] = await Promise.all([
          call(`/api/host/tables?business_id=${biz}`, { cookie: state.cookies.WAITER, ip: ip(2) }),
          call('/api/host/sessions', { cookie: state.cookies.WAITER, ip: ip(2) }),
          call(`/api/host/kitchen/tickets?business_id=${biz}`, { cookie: state.cookies.CHEF, ip: ip(2) }),
        ]);
        latencies.waiterTables.push(t.ms); latencies.waiterSessions.push(s.ms); latencies.chefTickets.push(k.ms);
        await sleep(1000);
      }
    };
    const pollers = Promise.all([poll(), poll()]);

    const expectedByTable: Record<string, number> = { 'T-02': 0, 'T-03': 0 };
    const t0 = performance.now();
    const results = await Promise.all(Array.from({ length: RUSH_GUESTS }, async (_, i) => {
      const table = tables[i % 2];
      const dish = dishes[i % 3];
      const qty = 1 + (i % 3);
      expectedByTable[table] += Number(dish.price) * qty;
      const r = await call('/api/guest/order', { method: 'POST', ip: ip(100 + i), body: {
        cafe_id: biz, table_number: table, guest_name: `Rush Guest ${i}`, client_order_nonce: `rush-${Date.now()}-${i}`,
        items: [{ id: dish.id, name: dish.name, quantity: qty }],
      } });
      latencies.order.push(r.ms);
      statuses[r.status] = (statuses[r.status] || 0) + 1;
      return r;
    }));
    const wall = (performance.now() - t0) / 1000;
    await sleep(1500);
    running = false;
    await pollers;

    const accepted = results.filter((r) => r.status === 200 && r.json?.success).length;
    note(`Rush: ${RUSH_GUESTS} guests order at once on 2 tables`, accepted === RUSH_GUESTS, pct(latencies.order, 95),
      `accepted ${accepted}/${RUSH_GUESTS} in ${wall.toFixed(1)} s; HTTP ${JSON.stringify(statuses)}; p50 ${pct(latencies.order, 50).toFixed(0)} ms, p95 ${pct(latencies.order, 95).toFixed(0)} ms`);
    note('Rush: waiter tables read (p95)', pct(latencies.waiterTables, 95) < 3000, pct(latencies.waiterTables, 95), `${latencies.waiterTables.length} reads, p50 ${pct(latencies.waiterTables, 50).toFixed(0)} ms`);
    note('Rush: waiter sessions read (p95)', pct(latencies.waiterSessions, 95) < 3000, pct(latencies.waiterSessions, 95), `${latencies.waiterSessions.length} reads, p50 ${pct(latencies.waiterSessions, 50).toFixed(0)} ms`);
    note('Rush: chef tickets read (p95)', pct(latencies.chefTickets, 95) < 3000, pct(latencies.chefTickets, 95), `${latencies.chefTickets.length} reads, p50 ${pct(latencies.chefTickets, 50).toFixed(0)} ms`);

    // Correctness: one bill per table, and its total is exactly what the guests ordered.
    for (const table of tables) {
      const { data: orders } = await db.from('orders').select('id, status, grand_total, subtotal').eq('business_id', biz).eq('table_number', table);
      const open = (orders || []).filter((o: any) => !['settled', 'cancelled', 'completed'].includes(String(o.status).toLowerCase()));
      const total = open.reduce((s: number, o: any) => s + Number(o.subtotal ?? o.grand_total ?? 0), 0);
      note(`Rush: ${table} has exactly one open bill`, open.length === 1, undefined, `${open.length} open order(s)`);
      note(`Rush: ${table} bill equals what was ordered`, Math.abs(total - expectedByTable[table]) < 0.01, undefined, `bill ${total} vs ordered ${expectedByTable[table]}`);
      state[`open_${table}`] = open;
    }
  }, 180_000);

  it('9. cashier settles both busy tables at the same time', async () => {
    const jobs = ['T-02', 'T-03'].map(async (table) => {
      const order = state[`open_${table}`]?.[0];
      if (!order) return { table, status: 0 };
      const total = Number(order.subtotal ?? order.grand_total);
      const r = await call('/api/host/sessions', { method: 'PATCH', cookie: state.cookies.CASHIER, body: {
        table_number: table, order_id: order.id, payment_method: 'UPI', subtotal: total, grand_total: total, tax_amount: 0,
      } });
      return { table, status: r.status, ms: r.ms };
    });
    const out = await Promise.all(jobs);
    for (const o of out) {
      note(`Cashier settles ${o.table} (UPI)`, o.status === 200, (o as any).ms, `HTTP ${o.status}`);
      expect(o.status).toBe(200);
    }
    const { data: left } = await db.from('orders').select('id, status').eq('business_id', biz);
    const stillOpen = (left || []).filter((o: any) => !['settled', 'cancelled', 'completed'].includes(String(o.status).toLowerCase()));
    note('No order left open at the venue', stillOpen.length === 0, undefined, `${stillOpen.length} open`);
    expect(stillOpen).toHaveLength(0);

    // Daily order numbers (migration 20261018000001): every order of the venue's day has ORD-001, 002 ... with none
    // missing and none twice, even though 24 orders were placed at the same instant.
    const { data: numbered } = await db.from('orders').select('order_number, order_seq, order_day').eq('business_id', biz);
    const seqs = (numbered || []).map((o: any) => Number(o.order_seq)).sort((a: number, b: number) => a - b);
    const formatOk = (numbered || []).every((o: any) => /^ORD-\d{3,}$/.test(String(o.order_number)) && o.order_number === `ORD-${String(o.order_seq).padStart(3, '0')}`);
    const days = new Set((numbered || []).map((o: any) => o.order_day));
    const whole = days.size === 1 && seqs.every((s: number, i: number) => s === i + 1);
    note(`Order numbers: ${seqs.length} orders numbered ORD-001..ORD-${String(seqs.length).padStart(3, '0')}, none missing or repeated`, formatOk && whole, undefined, `${days.size} billing day(s), seqs ${seqs[0]}..${seqs[seqs.length - 1]}`);
    expect(formatOk && whole).toBe(true);
  }, 60_000);

  it('10. websockets: the floor ping and ticket events', async () => {
    note('Websocket: guest channel connects', Boolean(state.guestSocket));
    note('Websocket: floor-ping channel connects', Boolean(state.floorSocket));
    note('Websocket: floor pings received during the run', state.floorPings > 0, undefined,
      state.floorPings > 0 ? `${state.floorPings} pings` : 'none: migration 20261016000004_floor_ping.sql is not applied on this database yet');
    note('Websocket: guest got kitchen status events', state.kotEvents > 0, undefined, `${state.kotEvents} events`);
    expect(state.guestSocket).toBe(true);
  });
});

/** Deletes every row that belongs to the test venue, in as many passes as foreign keys need, then the venue itself. */
async function cleanUp(db: any, env: Record<string, string>, biz: string) {
  const out = { deleted: 0, left: 0, stuck: [] as string[] };
  if (!biz) return out;
  const spec = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } })
    .then((r) => r.json()).catch(() => null);
  const targets: Array<[string, string]> = [];
  for (const [table, def] of Object.entries<any>(spec?.definitions || {})) {
    if (table === 'businesses') continue;
    for (const col of ['business_id', 'venue_id']) if (def?.properties?.[col]) { targets.push([table, col]); break; }
  }
  for (let pass = 0; pass < 5; pass++) {
    let progressed = false;
    for (const [table, col] of targets) {
      const { data } = await db.from(table).delete().eq(col, biz).select('*');
      if (data?.length) { out.deleted += data.length; progressed = true; }
    }
    if (!progressed) break;
  }
  const { error } = await db.from('businesses').delete().eq('id', biz);
  if (error) out.stuck.push(`businesses: ${error.message}`);
  for (const [table, col] of targets) {
    const { count } = await db.from(table).select('*', { count: 'exact', head: true }).eq(col, biz);
    if (count) { out.left += count; out.stuck.push(`${table}:${count}`); }
  }
  const { count: biz_left } = await db.from('businesses').select('*', { count: 'exact', head: true }).eq('id', biz);
  out.left += biz_left || 0;
  return out;
}

function writeReport() {
  const lines = ['# A-to-Z live test report', '', `Target: ${BASE} (disposable venue "ZZ E2E Test Venue", removed afterwards)`, '',
    '| # | Step | Result | Time | Detail |', '|---:|---|:---:|---:|---|',
    ...report.map((r, i) => `| ${i + 1} | ${r.step} | ${r.ok ? 'PASS' : 'FAIL'} | ${r.ms === undefined ? '' : `${r.ms.toFixed(0)} ms`} | ${r.note ?? ''} |`),
    '', `**${report.filter((r) => r.ok).length} / ${report.length} checks passed.**`, ''];
  try { mkdirSync('docs', { recursive: true }); writeFileSync('docs/e2e-a-to-z-report.md', lines.join('\n')); } catch { /* console below */ }
  console.log(lines.join('\n'));
}

// Floor stress test: every listed table seated and ordering at once, a rush of add-ons, the kitchen moving every ticket,
// the waiter serving them all, every table asking for the bill, then a full clean-up. Run against a deployment:
//
//   node scripts/audit/floor-stress.mjs . https://www.vibersconnect.com <business_id> T-03,T-06,T-07,...
//
// It places real test orders (reads .env.local for the database keys) and cancels every one of them at the end. Use a
// test venue and tables nobody is using; it refuses to start if a listed table already has an open order or session.
// Orders go through the public guest API, exactly as phones send them. The kitchen and waiter steps call
// update_kot_status, the database function the kitchen route runs. Pushes are timed on the channels the screens listen
// to: the venue's floor ping (kitchen, waiter and cashier terminals) and each table's own channel (the guest's phone).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const [rootArg, base, biz, tableArg] = process.argv.slice(2);
const root = path.resolve(rootArg || '.');
const TABLES = String(tableArg || '').split(',').map((t) => t.trim()).filter(Boolean);
if (!base || !biz || TABLES.length === 0) { console.log('usage: node scripts/audit/floor-stress.mjs . <base url> <business_id> <T-03,T-06,...>'); process.exit(1); }
const ADDONS_PER_TABLE = 2;
const env = Object.fromEntries(fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]));
const { createClient } = createRequire(path.join(root, 'package.json'))('@supabase/supabase-js');
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const now = () => performance.now();
const variants = (t) => { const n = t.replace(/^T-/i, ''); return [t, n, `Table ${n}`, `${t} (Add-on KOT)`]; };
const ALL_VARIANTS = TABLES.flatMap(variants);
const norm = (t) => t.replace(/^table\s*/i, '').replace(/^t-/i, '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '_');
const startedAt = new Date(Date.now() - 1000).toISOString();
const findings = [];
const check = (ok, what) => { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) findings.push(what); };

function stats(list) {
  const v = list.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return 'no samples';
  const p = (q) => v[Math.min(v.length - 1, Math.floor(q * (v.length - 1)))];
  return `n=${v.length}  p50 ${Math.round(p(0.5))} ms  p95 ${Math.round(p(0.95))} ms  max ${Math.round(v[v.length - 1])} ms`;
}

// ── Listeners: the venue's floor ping (with ticket stages) and each table's channel ─────────────────────────────────
const stageSeen = new Map(); // `${ticketId}:${status}` -> time first seen on the floor ping
const tablePings = new Map(); // table -> list of arrival times
let floorPings = 0;
const subscribe = (ch) => new Promise((res) => ch.subscribe((s) => { if (s === 'SUBSCRIBED') res(); }));
const floor = anon.channel(`floor_${biz.toLowerCase()}`).on('broadcast', { event: 'changed' }, (m) => {
  floorPings++;
  const p = m?.payload || {};
  if (p.k && p.s) { const key = `${p.k}:${String(p.s).toUpperCase()}`; if (!stageSeen.has(key)) stageSeen.set(key, now()); }
});
const tableChannels = TABLES.map((t) => anon.channel(`biz_${biz.toLowerCase()}_table_${norm(t)}`).on('broadcast', { event: 'changed' }, () => {
  if (!tablePings.has(t)) tablePings.set(t, []);
  tablePings.get(t).push(now());
}));
await Promise.all([subscribe(floor), ...tableChannels.map(subscribe)]);
const firstPingAfter = (t, since) => (tablePings.get(t) || []).find((x) => x >= since);

// ── Safety: every listed table must be free ─────────────────────────────────────────────────────────────────────────
// An open session with nothing on it (a table left open) is allowed: it is recorded here and put back as it was at the end.
const CLOSED = '("settled","SETTLED","completed","COMPLETED","cancelled","CANCELLED","billed","closed","CLOSED")';
const [{ data: openOrders }, { data: openSessions }] = await Promise.all([
  admin.from('orders').select('table_number').eq('business_id', biz).in('table_number', ALL_VARIANTS).not('status', 'in', CLOSED),
  admin.from('dine_in_sessions').select('id, table_number, status').eq('business_id', biz).in('table_number', ALL_VARIANTS).in('status', ['open', 'bill_requested']),
]);
if ((openOrders || []).length) {
  console.log('refusing to start: these tables already have an open order:', [...new Set(openOrders.map((r) => r.table_number))].join(', '));
  process.exit(1);
}
const keptSessions = openSessions || [];
if (keptSessions.length) console.log(`tables with an open session (put back at the end): ${keptSessions.map((s) => s.table_number).join(' ')}`);
// The guest order limit per address and venue, per minute. A wave that would pass it waits for the window to clear.
const ORDER_LIMIT = Number(process.env.ORDER_LIMIT || 40);
let windowStart = 0;
let windowCount = 0;
async function roomFor(n) {
  if (windowStart && windowCount + n <= ORDER_LIMIT - 1) { windowCount += n; return; }
  const wait = windowStart ? Math.max(0, windowStart + 61_000 - now()) : 0;
  if (wait) { console.log(`  (waiting ${Math.round(wait / 1000)} s for the per-minute order limit of ${ORDER_LIMIT} to clear)`); await new Promise((r) => setTimeout(r, wait)); }
  windowStart = now();
  windowCount = n;
}
const { data: menu } = await admin.from('catalog_items').select('id, name').eq('business_id', biz).neq('is_available', false).limit(10);
if (!menu?.length) { console.log('no menu item to order'); process.exit(1); }

const order = async (table, i) => {
  const item = menu[i % menu.length];
  const t = now();
  const res = await fetch(`${base}/api/guest/order`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ business_id: biz, cafe_id: biz, table_number: table, guest_name: 'Stress test', items: [{ item_id: item.id, id: item.id, quantity: 1 }], idempotency_key: `stress-${crypto.randomUUID()}` }),
  }).catch((e) => ({ ok: false, status: 0, json: async () => ({ error: e.message }) }));
  const body = await res.json().catch(() => ({}));
  // The route's own time per step (Server-Timing), when the deployment sends it.
  const timing = Object.fromEntries(String(res.headers?.get?.('server-timing') || '').split(',').map((p) => p.trim().match(/^(\w+);dur=([\d.]+)/)).filter(Boolean).map((m) => [m[1], Number(m[2])]));
  return { table, ms: now() - t, start: t, ok: res.ok && body.success, status: res.status, error: body.error, region: res.headers?.get?.('x-vercel-id'), timing };
};
const serverSplit = (runs) => {
  if (!runs.some((r) => r.timing?.total)) return;
  for (const k of ['venue', 'checks', 'guard', 'place', 'wait', 'reads', 'rpc', 'total']) {
    if (runs.some((r) => r.timing?.[k] !== undefined)) console.log(`  server ${k.padEnd(11)} ${stats(runs.map((r) => r.timing?.[k]))}`);
  }
};

try {
  console.log(`target ${base}, ${TABLES.length} tables: ${TABLES.join(' ')}`);

  // ── 1. Every table orders at the same moment ──────────────────────────────────────────────────────────────────────
  console.log('\n1. every table orders at once (new bills)');
  await roomFor(TABLES.length);
  let pingsBefore = floorPings;
  const first = await Promise.all(TABLES.map((t, i) => order(t, i)));
  await new Promise((r) => setTimeout(r, 1200));
  console.log(`  floor pushes       ${floorPings - pingsBefore} for ${TABLES.length} orders (${((floorPings - pingsBefore) / TABLES.length).toFixed(1)} per order)`);
  console.log(`  served from ${first.find((r) => r.region)?.region?.split('::')[1] || '?'}`);
  console.log(`  order call         ${stats(first.map((r) => r.ms))}`);
  console.log(`  table screen told  ${stats(first.map((r) => (firstPingAfter(r.table, r.start) ?? NaN) - r.start))}`);
  serverSplit(first);
  check(first.every((r) => (firstPingAfter(r.table, r.start) ?? NaN) >= 0), `every table's screen got its push (${first.filter((r) => firstPingAfter(r.table, r.start) !== undefined).length} of ${first.length})`);
  check(first.every((r) => r.ok), `all ${TABLES.length} first orders accepted${first.some((r) => !r.ok) ? ` (failed: ${first.filter((r) => !r.ok).map((r) => `${r.table} ${r.status} ${r.error || ''}`).join('; ')})` : ''}`);

  // ── 2. A rush of add-ons: several guests per table at the same moment ─────────────────────────────────────────────
  console.log(`\n2. rush: ${ADDONS_PER_TABLE} add-ons per table, all at once (${TABLES.length * ADDONS_PER_TABLE} orders in parallel)`);
  await roomFor(TABLES.length * ADDONS_PER_TABLE);
  pingsBefore = floorPings;
  const rush = await Promise.all(TABLES.flatMap((t, i) => Array.from({ length: ADDONS_PER_TABLE }, (_, k) => order(t, i + k + 1))));
  await new Promise((r) => setTimeout(r, 1200));
  console.log(`  floor pushes       ${floorPings - pingsBefore} for ${rush.length} orders (${((floorPings - pingsBefore) / rush.length).toFixed(1)} per order)`);
  console.log(`  order call         ${stats(rush.map((r) => r.ms))}`);
  console.log(`  table screen told  ${stats(rush.map((r) => (firstPingAfter(r.table, r.start) ?? NaN) - r.start))}`);
  serverSplit(rush);
  check(rush.every((r) => r.ok), `all ${rush.length} add-ons accepted${rush.some((r) => !r.ok) ? ` (failed: ${rush.filter((r) => !r.ok).map((r) => `${r.table} ${r.status} ${r.error || ''}`).join('; ')})` : ''}`);

  // Integrity: one bill per table, every line on it once, one kitchen ticket per order.
  const perTable = 1 + ADDONS_PER_TABLE;
  const [{ data: orders }, { data: tickets }] = await Promise.all([
    admin.from('orders').select('id, table_number, status').eq('business_id', biz).in('table_number', ALL_VARIANTS).gte('created_at', startedAt).not('status', 'in', CLOSED),
    admin.from('kitchen_tickets').select('id, table_or_room, status, order_id').eq('business_id', biz).in('table_or_room', ALL_VARIANTS).gte('created_at', startedAt),
  ]);
  const { data: lines } = await admin.from('order_items').select('order_id').in('order_id', (orders || []).map((o) => o.id));
  const byTable = (rows, col) => TABLES.map((t) => (rows || []).filter((r) => variants(t).includes(r[col])).length);
  check(byTable(orders, 'table_number').every((n) => n === 1), `exactly one open bill per table (got ${byTable(orders, 'table_number').join(',')})`);
  check((lines || []).length === TABLES.length * perTable, `every dish on its table's bill once (${(lines || []).length} of ${TABLES.length * perTable})`);
  check(byTable(tickets, 'table_or_room').every((n) => n === perTable), `one kitchen ticket per order (per table: ${byTable(tickets, 'table_or_room').join(',')})`);

  // ── 3. The kitchen starts and finishes every ticket at once ───────────────────────────────────────────────────────
  const moveAll = async (status) => {
    const runs = await Promise.all((tickets || []).map(async (tk) => {
      const t = now();
      const { error } = await admin.rpc('update_kot_status', { p_ticket_id: tk.id, p_new_status: status, p_staff_id: null });
      return { id: tk.id, start: t, ms: now() - t, error };
    }));
    await new Promise((r) => setTimeout(r, 1500));
    const told = runs.map((r) => (stageSeen.get(`${r.id}:${status}`) ?? NaN) - r.start);
    console.log(`  write              ${stats(runs.map((r) => r.ms))}`);
    console.log(`  terminals told     ${stats(told)}  (the push names the ticket and its stage)`);
    check(runs.every((r) => !r.error), `all ${runs.length} tickets moved to ${status}${runs.some((r) => r.error) ? `: ${runs.find((r) => r.error).error.message}` : ''}`);
    check(told.every(Number.isFinite), `every ${status} reached the terminals by push (${told.filter(Number.isFinite).length} of ${told.length})`);
    const { data: after } = await admin.from('kitchen_tickets').select('status').in('id', (tickets || []).map((t) => t.id));
    check((after || []).every((t) => t.status === status), `a read right after shows every ticket ${status} (no stale state)`);
  };
  console.log('\n3a. kitchen: every ticket to PREPARING at once'); await moveAll('PREPARING');
  console.log('\n3b. kitchen: every ticket to READY at once (the waiter\'s ready bar)'); await moveAll('READY');

  // ── 4. The waiter serves everything at once ───────────────────────────────────────────────────────────────────────
  console.log('\n4. waiter: every ticket SERVED at once'); await moveAll('SERVED');

  // ── 5. Every table asks for the bill at once (the cashier's bell) ─────────────────────────────────────────────────
  console.log('\n5. every table asks for the bill at once');
  const bills = await Promise.all(TABLES.map(async (table) => {
    const t = now();
    const res = await fetch(`${base}/api/guest/session`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business_id: biz, cafe_id: biz, table_number: table, action: 'request_bill', status: 'bill_requested' }) });
    return { table, ms: now() - t, start: t, ok: res.ok };
  }));
  console.log(`  request call       ${stats(bills.map((r) => r.ms))}`);
  console.log(`  table screen told  ${stats(bills.map((r) => (firstPingAfter(r.table, r.start) ?? NaN) - r.start))}`);
  check(bills.every((r) => r.ok), `all ${TABLES.length} bill requests accepted`);
  const [{ data: calls }, { data: sessions }, { data: events }] = await Promise.all([
    admin.from('staff_notifications').select('table_number').eq('business_id', biz).eq('notification_type', 'BILL').eq('status', 'PENDING').in('table_number', ALL_VARIANTS).gte('created_at', startedAt),
    admin.from('dine_in_sessions').select('table_number, status').eq('business_id', biz).in('table_number', ALL_VARIANTS).eq('status', 'bill_requested'),
    admin.from('bill_request_events').select('table_number').eq('business_id', biz).in('table_number', ALL_VARIANTS).is('settled_at', null),
  ]);
  check((calls || []).length === TABLES.length, `the bell rings once per table (${(calls || []).length} calls for ${TABLES.length} tables)`);
  check((sessions || []).length === TABLES.length, `every table shows "bill requested" for the cashier (${(sessions || []).length})`);
  check((events || []).length === TABLES.length, `one bill request per table in the cashier's list (${(events || []).length})`);

  // ── 6. What each guest's phone reads right after, through the public API ──────────────────────────────────────────
  console.log('\n6. read-after-write: each table\'s guest view');
  const reads = await Promise.all(TABLES.map(async (table) => {
    const t = now();
    const res = await fetch(`${base}/api/guest/order?cafe_id=${biz}&table=${encodeURIComponent(table)}`, { cache: 'no-store' });
    const body = await res.json().catch(() => ({}));
    return { ms: now() - t, items: (body.items || body.order?.items || []).length, billRequested: Boolean(body.bill_requested || body.session?.status === 'bill_requested' || body.billRequested) };
  }));
  console.log(`  guest read         ${stats(reads.map((r) => r.ms))}`);
  check(reads.every((r) => r.items > 0), 'every guest sees their bill with its dishes');

  // ── 7. Read storm: four phones per table all reading their bill at the same moment ──────────────────────────────────
  const phones = TABLES.length * 4;
  console.log(`\n7. read storm: ${phones} guest phones read their bill at the same moment`);
  const storm = await Promise.all(Array.from({ length: phones }, async (_, i) => {
    const t = now();
    const res = await fetch(`${base}/api/guest/order?cafe_id=${biz}&table=${encodeURIComponent(TABLES[i % TABLES.length])}`, { cache: 'no-store' }).catch(() => null);
    return { ms: now() - t, ok: Boolean(res?.ok) };
  }));
  console.log(`  guest read         ${stats(storm.map((r) => r.ms))}`);
  check(storm.every((r) => r.ok), `all ${phones} reads answered (${storm.filter((r) => r.ok).length})`);
  console.log(`\nfloor pings received: ${floorPings}`);
} finally {
  // ── Clean-up: every test row is cancelled or closed; nothing is settled, so no bill or fee is recorded ────────────
  const at = new Date().toISOString();
  const { data: tks } = await admin.from('kitchen_tickets').select('id, status').eq('business_id', biz).in('table_or_room', ALL_VARIANTS).gte('created_at', startedAt);
  await Promise.all((tks || []).filter((t) => !['SERVED', 'CANCELLED'].includes(t.status)).map((t) => admin.rpc('update_kot_status', { p_ticket_id: t.id, p_new_status: 'CANCELLED', p_staff_id: null })));
  const { data: ords } = await admin.from('orders').select('id').eq('business_id', biz).in('table_number', ALL_VARIANTS).gte('created_at', startedAt);
  const ids = (ords || []).map((o) => o.id);
  if (ids.length) await admin.from('orders').update({ status: 'cancelled', updated_at: at }).in('id', ids).eq('business_id', biz);
  await admin.from('dine_in_sessions').update({ status: 'closed', updated_at: at }).eq('business_id', biz).in('table_number', ALL_VARIANTS).in('status', ['open', 'bill_requested']).gte('created_at', startedAt);
  // Sessions that were open before the run go back to exactly what they were: the test orders placed on them are unlinked
  // first (a cancelled order with cooked dishes on the seated party's session stops the table being marked vacant), then
  // each session gets its old status back.
  const keptIds = keptSessions.map((s) => s.id);
  if (keptIds.length && ids.length) await admin.from('orders').update({ session_id: null }).in('id', ids).in('session_id', keptIds).eq('business_id', biz);
  for (const s of keptSessions) await admin.from('dine_in_sessions').update({ status: s.status }).eq('id', s.id).eq('business_id', biz);
  await admin.from('restaurant_tables').update({ status: 'VACANT' }).eq('business_id', biz).in('table_number', TABLES);
  await admin.from('bill_request_events').update({ settled_at: at }).eq('business_id', biz).in('table_number', ALL_VARIANTS).is('settled_at', null);
  await admin.from('staff_notifications').update({ status: 'RESOLVED' }).eq('business_id', biz).in('table_number', ALL_VARIANTS).eq('status', 'PENDING');
  console.log(`\nclean-up: ${ids.length} test orders cancelled, ${(tks || []).length} tickets closed, ${TABLES.length} tables vacant`);
  console.log(findings.length ? `\nFINDINGS (${findings.length}):\n- ${findings.join('\n- ')}` : '\nall checks passed');
  await Promise.all([anon.removeChannel(floor), ...tableChannels.map((c) => anon.removeChannel(c))]);
  setTimeout(() => process.exit(findings.length ? 1 : 0), 300);
}

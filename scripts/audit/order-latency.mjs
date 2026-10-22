// End-to-end timing of the floor pipeline on a real deployment, at one empty test table, then a full clean-up.
// usage: node scripts/audit/order-latency.mjs . https://www.vibersconnect.com <business_id> <empty test table>
// It places real test orders on that table (reads .env.local for the database keys) and cancels them at the end: run it only
// on a test venue and a table nobody is using. Compare the numbers before and after a deploy.
// Steps timed: guest places an order (3x: one new bill, two add-ons), the kitchen marks the ticket PREPARING and READY
// (through the same database function the route calls), the waiter marks it SERVED, the guest asks for the bill.
// For each: how long the HTTP call takes, and when the venue's floor ping reaches a listening device.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const [root, base, biz, table] = process.argv.slice(2);
const env = Object.fromEntries(fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]));
const { createClient } = createRequire(path.join(root, 'package.json'))('@supabase/supabase-js');
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const variants = [table, table.replace(/^T-/i, ''), `Table ${table.replace(/^T-/i, '')}`];
const startedAt = new Date().toISOString();

let waiters = [];
const ch = anon.channel(`floor_${biz.toLowerCase()}`).on('broadcast', { event: 'changed' }, () => {
  const now = performance.now();
  waiters.forEach((w) => w(now));
  waiters = [];
});
await new Promise((res) => ch.subscribe((s) => { if (s === 'SUBSCRIBED') res(); }));
const nextPing = () => new Promise((res) => { waiters.push(res); setTimeout(() => res(null), 5000); });

async function timed(label, fn) {
  const ping = nextPing();
  const t = performance.now();
  let out;
  try { out = await fn(); } catch (e) { out = { error: e.message }; }
  const callMs = Math.round(performance.now() - t);
  const p = await ping;
  console.log(`${label.padEnd(34)} call ${String(callMs).padStart(5)} ms   ping at ${p ? String(Math.round(p - t)).padStart(5) + ' ms' : '   none'}${out?.error ? '   ERROR ' + out.error : ''}`);
  return out;
}

const { data: item } = await admin.from('catalog_items').select('id').eq('business_id', biz).neq('is_available', false).eq('item_type', 'food').limit(1).maybeSingle()
  .then((r) => (r.data ? r : admin.from('catalog_items').select('id').eq('business_id', biz).neq('is_available', false).limit(1).maybeSingle()));
if (!item) { console.log('no menu item to order'); process.exit(1); }

const placeOrder = async () => {
  const res = await fetch(`${base}/api/guest/order`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ business_id: biz, cafe_id: biz, table_number: table, guest_name: 'Latency test', items: [{ item_id: item.id, id: item.id, quantity: 1 }], idempotency_key: `lat-${crypto.randomUUID()}` }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(`${res.status} ${body.error || ''}`);
  return body;
};

try {
  console.log(`target ${base}`);
  for (let i = 1; i <= 3; i++) await timed(`guest places order #${i}`, placeOrder);
  const { data: tickets } = await admin.from('kitchen_tickets').select('id, status').eq('business_id', biz).in('table_or_room', [...variants, `${table} (Add-on KOT)`]).gte('created_at', startedAt).order('created_at');
  const ticket = tickets?.[0];
  if (ticket) {
    for (const s of ['PREPARING', 'READY', 'SERVED']) {
      await timed(`kitchen ticket -> ${s} (db function)`, async () => {
        const { error } = await admin.rpc('update_kot_status', { p_ticket_id: ticket.id, p_new_status: s, p_staff_id: null });
        if (error) throw new Error(error.message);
      });
    }
  }
  await timed('guest requests the bill', async () => {
    const res = await fetch(`${base}/api/guest/session`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business_id: biz, cafe_id: biz, table_number: table, action: 'request_bill', status: 'bill_requested' }) });
    if (!res.ok) throw new Error(String(res.status));
  });
  const { data: calls } = await admin.from('staff_notifications').select('notification_type').eq('business_id', biz).in('table_number', variants).gte('created_at', startedAt);
  console.log(`bill call rang the bell: ${(calls || []).some((c) => c.notification_type === 'BILL') ? 'yes' : 'no'}`);
} finally {
  // Clean-up, scoped to this table and to rows made since the run started.
  const now = new Date().toISOString();
  const { data: tks } = await admin.from('kitchen_tickets').select('id, status').eq('business_id', biz).gte('created_at', startedAt).in('table_or_room', [...variants, `${table} (Add-on KOT)`]);
  for (const t of tks || []) if (!['SERVED', 'CANCELLED'].includes(t.status)) await admin.rpc('update_kot_status', { p_ticket_id: t.id, p_new_status: 'CANCELLED', p_staff_id: null });
  const { data: ords } = await admin.from('orders').select('id').eq('business_id', biz).in('table_number', variants).gte('created_at', startedAt);
  const ids = (ords || []).map((o) => o.id);
  if (ids.length) await admin.from('orders').update({ status: 'cancelled', updated_at: now }).in('id', ids).eq('business_id', biz);
  await admin.from('dine_in_sessions').update({ status: 'closed', updated_at: now }).eq('business_id', biz).in('table_number', variants).in('status', ['open', 'bill_requested']);
  await admin.from('restaurant_tables').update({ status: 'VACANT' }).eq('business_id', biz).in('table_number', variants);
  await admin.from('bill_request_events').update({ settled_at: now }).eq('business_id', biz).in('table_number', variants).is('settled_at', null);
  await admin.from('staff_notifications').update({ status: 'RESOLVED' }).eq('business_id', biz).in('table_number', variants).eq('status', 'PENDING');
  console.log(`cleaned up: ${ids.length} test orders cancelled, ${(tks || []).length} tickets closed, table ${table} vacant`);
  await anon.removeChannel(ch);
  setTimeout(() => process.exit(0), 300);
}

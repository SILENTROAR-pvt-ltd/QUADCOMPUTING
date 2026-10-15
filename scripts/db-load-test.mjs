#!/usr/bin/env node
// Read-only database throughput test. It runs the same SELECTs one guest status poll runs (the table's open order and
// session at once, then the order's dishes and kitchen ticket at once), straight against Supabase, at rising
// concurrency. This measures the database and the network to it, with no web server in between.
//
//   node scripts/db-load-test.mjs --venue <venue-uuid> --table T-01
//
// It reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local, never prints them, and only SELECTs.
// Options: --levels 5,15,30,60,100   --seconds 10   --allow-remote is not needed: it always targets the project in .env.local,
// so run it against a staging project unless you accept ~ a few thousand reads on production.

import { createClient } from '@supabase/supabase-js';

try { process.loadEnvFile('.env.local'); } catch { /* the variables may already be in the environment */ }

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return acc;
}, []));

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VENUE = args.venue;
const TABLE = String(args.table || 'T-01');
const LEVELS = String(args.levels || '5,15,30,60,100').split(',').map(Number).filter(Boolean);
const SECONDS = Number(args.seconds || 10);

if (!URL || !KEY) { console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed (in .env.local).'); process.exit(2); }
if (!VENUE) { console.error('Missing --venue <venue-uuid>'); process.exit(2); }

const db = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const CLOSED = ['settled', 'SETTLED', 'completed', 'COMPLETED', 'paid', 'PAID', 'cancelled', 'CANCELLED', 'closed', 'CLOSED'];
const variants = [TABLE, `Table ${TABLE}`, `T-${TABLE.replace(/^t-/i, '')}`].map((v) => `table_number.eq."${v}"`).join(',');

const pct = (s, p) => (s.length ? s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] : 0);
let queries = 0;
let failures = 0;

async function q(promise) {
  queries++;
  const res = await promise;
  if (res.error) failures++;
  return res;
}

// One guest poll's reads: round 1 (order + session), round 2 (dishes + ticket) when an order is open.
async function poll() {
  const [orders] = await Promise.all([
    q(db.from('orders').select('*').eq('business_id', VENUE).or(variants).not('status', 'in', `(${CLOSED.map((s) => `"${s}"`).join(',')})`).order('created_at', { ascending: false }).limit(1)),
    q(db.from('dine_in_sessions').select('id, status').eq('business_id', VENUE).or(variants).in('status', ['open', 'bill_requested']).order('updated_at', { ascending: false }).limit(1).maybeSingle()),
  ]);
  const order = orders.data?.[0];
  if (order) {
    await Promise.all([
      q(db.from('order_items').select('*').eq('order_id', order.id).order('created_at', { ascending: true })),
      q(db.from('kitchen_tickets').select('*').eq('business_id', VENUE).eq('order_id', order.id).order('created_at', { ascending: false }).limit(1).maybeSingle()),
    ]);
  }
}

console.log(`Database load test (read-only) on ${new globalThis.URL(URL).host.replace(/^[^.]+/, '***')}  venue=${VENUE}  table=${TABLE}`);
for (const workers of LEVELS) {
  const lat = [];
  queries = 0; failures = 0;
  const until = performance.now() + SECONDS * 1000;
  const t0 = performance.now();
  await Promise.all(Array.from({ length: workers }, async () => {
    while (performance.now() < until) {
      const s = performance.now();
      try { await poll(); lat.push(performance.now() - s); } catch { failures++; }
    }
  }));
  const secs = (performance.now() - t0) / 1000;
  lat.sort((a, b) => a - b);
  console.log({
    workers,
    'polls/s': (lat.length / secs).toFixed(1),
    'queries/s': (queries / secs).toFixed(1),
    p50: Math.round(pct(lat, 50)),
    p95: Math.round(pct(lat, 95)),
    p99: Math.round(pct(lat, 99)),
    failed: failures,
  });
  if (failures > queries * 0.05) { console.log('STOPPED: more than 5% of queries failed.'); break; }
}

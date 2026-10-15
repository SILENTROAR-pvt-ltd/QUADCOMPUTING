#!/usr/bin/env node
// Read-only load test for the guest side of QC. It plays "virtual guest phones" that poll the way the real app does
// (order status every 8 s, session status every 10 s, a little jitter), in stages of growing size, and reports latency
// percentiles, errors and throughput. It never sends a POST/PATCH/DELETE, so it cannot create or change an order.
//
//   node scripts/load-test.mjs --base http://127.0.0.1:3100 --venue <venue-uuid> --table T-01
//
// Options (all optional):
//   --stages 28,84,168,280   virtual guests per stage. 28 is about one busy venue (20 tables, 2 phones, 70% occupied).
//   --seconds 25             length of each stage
//   --burst 40               after the stages, N workers hammer the order status as fast as they can, to find the ceiling
//   --burst-seconds 10
//   --burst-path /some/path  what the burst requests (default: the order status). A path that makes no database call measures the server alone.
//   --max-mb 60              stop the whole test if it has downloaded this much (every response counts against the
//                            Supabase egress quota when the server talks to a real project)
//   --menu                   also fetch the full menu once per virtual guest (large: about 100 KB each)
//   --allow-remote           allow a base URL that is not localhost. Do this only against a staging project.
//
// Each group of 28 guests sends its own X-Forwarded-For address, because in a real venue they share one Wi-Fi address
// and the server rate-limits per address and venue.

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return acc;
}, []));

const BASE = String(args.base || 'http://127.0.0.1:3100').replace(/\/$/, '');
const VENUE = args.venue;
const TABLE = String(args.table || 'T-01');
const STAGES = String(args.stages || '28,84,168,280').split(',').map(Number).filter(Boolean);
const SECONDS = Number(args.seconds || 25);
const BURST = Number(args.burst ?? 40);
const BURST_SECONDS = Number(args['burst-seconds'] || 10);
const BURST_PATH = args['burst-path'] ? String(args['burst-path']) : null;
const MAX_BYTES = Number(args['max-mb'] || 60) * 1024 * 1024;
const WITH_MENU = Boolean(args.menu);
const PER_VENUE = 28;

if (!VENUE) { console.error('Missing --venue <venue-uuid>'); process.exit(2); }
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(BASE) && !args['allow-remote']) {
  console.error(`Refusing to load-test ${BASE}: it is not localhost. Use a staging project and pass --allow-remote.`);
  process.exit(2);
}

let downloaded = 0;
let aborted = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : 0);

function newStats() { return { ok: 0, limited: 0, errors: 0, lat: [], bytes: 0 }; }

async function hit(stats, path, ip) {
  if (aborted) return;
  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE}${path}`, { headers: { 'x-forwarded-for': ip }, cache: 'no-store' });
    const body = await res.arrayBuffer();
    const ms = performance.now() - t0;
    downloaded += body.byteLength;
    stats.bytes += body.byteLength;
    if (downloaded > MAX_BYTES) aborted = true;
    if (res.status === 429) stats.limited++;
    else if (res.ok) { stats.ok++; stats.lat.push(ms); }
    else stats.errors++;
  } catch {
    stats.errors++;
  }
}

const qs = `table=${encodeURIComponent(TABLE)}&cafe_id=${VENUE}`;
const ORDER = `/api/guest/order?${qs}`;
const SESSION = `/api/guest/session?session_id=load-test&${qs}`;
const MENU = `/api/guest/menu?${qs}`;

async function guest(stats, index, until) {
  const ip = `10.${Math.floor(index / PER_VENUE) % 250}.${Math.floor(index / 250) % 250}.${1 + (Math.floor(index / PER_VENUE) % 250)}`;
  await sleep(Math.random() * 3000); // phones do not all start in the same millisecond
  if (WITH_MENU) await hit(stats, MENU, ip);
  let nextOrder = performance.now();
  let nextSession = performance.now() + Math.random() * 4000;
  while (performance.now() < until && !aborted) {
    const now = performance.now();
    if (now >= nextOrder) { void hit(stats, ORDER, ip); nextOrder = now + 8000 + Math.random() * 800; }
    if (now >= nextSession) { void hit(stats, SESSION, ip); nextSession = now + 10000 + Math.random() * 1000; }
    await sleep(250);
  }
}

function report(label, stats, seconds, extra = '') {
  const lat = [...stats.lat].sort((a, b) => a - b);
  const total = stats.ok + stats.limited + stats.errors;
  const errRate = total ? ((stats.errors / total) * 100).toFixed(2) : '0.00';
  const row = {
    stage: label,
    requests: total,
    'req/s': (total / seconds).toFixed(1),
    p50: Math.round(pct(lat, 50)),
    p95: Math.round(pct(lat, 95)),
    p99: Math.round(pct(lat, 99)),
    max: Math.round(lat.at(-1) || 0),
    '429': stats.limited,
    errors: stats.errors,
    'err%': errRate,
    'MB': (stats.bytes / 1048576).toFixed(2),
  };
  console.log(extra ? { ...row, note: extra } : row);
  return { row, p95: pct(lat, 95), errRate: Number(errRate), limited: stats.limited };
}

console.log(`Load test: ${BASE}  venue=${VENUE}  table=${TABLE}  (read-only)  stop after ${(MAX_BYTES / 1048576).toFixed(0)} MB`);
const results = [];

for (const n of STAGES) {
  const stats = newStats();
  const until = performance.now() + SECONDS * 1000;
  await Promise.all(Array.from({ length: n }, (_, i) => guest(stats, i, until)));
  await sleep(1500); // let the last responses land
  const venues = (n / PER_VENUE).toFixed(1);
  results.push({ n, venues, ...report(`${n} guests (~${venues} venues)`, stats, SECONDS) });
  if (aborted) { console.log('STOPPED: download limit reached.'); break; }
}

if (BURST > 0 && !aborted) {
  const stats = newStats();
  const until = performance.now() + BURST_SECONDS * 1000;
  await Promise.all(Array.from({ length: BURST }, async (_, w) => {
    const ip = `192.168.${w % 250}.${1 + (w % 250)}`;
    while (performance.now() < until && !aborted) await hit(stats, BURST_PATH || ORDER, ip);
  }));
  results.push({ n: BURST, burst: true, ...report(`burst: ${BURST} workers, no pause`, stats, BURST_SECONDS, 'ceiling, not realistic load') });
}

console.log(`\nDownloaded ${(downloaded / 1048576).toFixed(1)} MB in total.`);
const steady = results.filter((r) => !r.burst);
const worst = steady.reduce((m, r) => Math.max(m, r.p95), 0);
const anyErr = steady.some((r) => r.errRate > 1);
const anyLimited = steady.some((r) => r.limited > 0);
console.log('\nBudget: p95 under 800 ms and under 1% errors at every realistic stage.');
console.log(`Result: worst p95 ${Math.round(worst)} ms; errors ${anyErr ? 'ABOVE 1%' : 'under 1%'}; rate-limited ${anyLimited ? 'YES (limits hit)' : 'no'}.`);
console.log(!anyErr && worst < 800 ? 'PASS' : 'FAIL');
process.exit(!anyErr && worst < 800 ? 0 : 1);

#!/usr/bin/env node
// Local load test for the guest menu: many virtual guests, each on its own address, each opening the venue's menu.
//   node scripts/load-test-menu.mjs --venue <uuid> [--table T-01] [--guests 100] [--seconds 20] [--base http://localhost:3000]
// It refuses a non-local --base unless --allow-remote is given: this reads the database behind whatever it points at.
// Reports requests/s, latency (median, p95, p99), status mix, and how the server's cache served the requests, from which
// the database reads are counted (one MISS = one read set of 3 queries; HIT and SHARED reach no database at all).
import { performance } from 'node:perf_hooks';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const base = arg('base', 'http://localhost:3000').replace(/\/$/, '');
const venue = arg('venue');
const table = arg('table', 'T-01');
const guests = Number(arg('guests', 100));
const seconds = Number(arg('seconds', 20));
const thinkMs = Number(arg('think-ms', 0)); // pause between one guest's requests (0 = as fast as possible)

if (!venue) { console.error('--venue <business uuid> is required'); process.exit(2); }
const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(base);
if (!local && !process.argv.includes('--allow-remote')) {
  console.error(`Refusing ${base}: not a local address. Pass --allow-remote to load-test it on purpose.`);
  process.exit(2);
}

const url = `${base}/api/guest/menu?cafe_id=${encodeURIComponent(venue)}&table=${encodeURIComponent(table)}`;
const latencies = [];
const status = new Map();
const cache = new Map();
let bytes = 0;
let failures = 0;

// Each virtual guest has its own address, as phones on mobile data do, so the per-address limiter sees one person each.
const fakeIp = (n) => `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`;

async function guest(n, until) {
  while (performance.now() < until) {
    const started = performance.now();
    try {
      const res = await fetch(url, { headers: { 'x-forwarded-for': fakeIp(n + 1) } });
      const body = await res.arrayBuffer();
      latencies.push(performance.now() - started);
      bytes += body.byteLength;
      status.set(res.status, (status.get(res.status) || 0) + 1);
      const c = res.headers.get('x-menu-cache') || 'none';
      cache.set(c, (cache.get(c) || 0) + 1);
    } catch {
      failures += 1;
    }
    if (thinkMs > 0) await new Promise((r) => setTimeout(r, thinkMs));
  }
}

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;

// One request first, outside the numbers, so the run measures a venue that has already been opened once.
const warm = await fetch(url, { headers: { 'x-forwarded-for': fakeIp(0) } });
console.log(`warm-up: HTTP ${warm.status}, cache ${warm.headers.get('x-menu-cache')}`);
if (!warm.ok) { console.error('The menu did not load; check the venue id, table and that the server is running.'); process.exit(1); }

const t0 = performance.now();
await Promise.all(Array.from({ length: guests }, (_, n) => guest(n, t0 + seconds * 1000)));
const elapsed = (performance.now() - t0) / 1000;

latencies.sort((a, b) => a - b);
const total = latencies.length;
const misses = cache.get('MISS') || 0;
const ok = status.get(200) || 0;
const f = (n) => n.toFixed(1);

console.log('\n| Metric | Value |');
console.log('|---|---:|');
console.log(`| Virtual guests (concurrent) | ${guests} |`);
console.log(`| Duration | ${f(elapsed)} s |`);
console.log(`| Requests completed | ${total} |`);
console.log(`| Requests per second | ${f(total / elapsed)} |`);
console.log(`| Latency median | ${f(pct(latencies, 50))} ms |`);
console.log(`| Latency p95 | ${f(pct(latencies, 95))} ms |`);
console.log(`| Latency p99 | ${f(pct(latencies, 99))} ms |`);
console.log(`| Latency max | ${f(latencies[total - 1] ?? 0)} ms |`);
console.log(`| HTTP 200 | ${ok} (${f((ok / Math.max(1, total)) * 100)}%) |`);
console.log(`| Other statuses | ${[...status].filter(([s]) => s !== 200).map(([s, n]) => `${s}: ${n}`).join(', ') || 'none'} |`);
console.log(`| Network failures | ${failures} |`);
console.log(`| Served from memory (HIT) | ${cache.get('HIT') || 0} |`);
console.log(`| Joined a running read (SHARED) | ${cache.get('SHARED') || 0} |`);
console.log(`| Read the database (MISS) | ${misses} |`);
console.log(`| Database queries (3 per MISS) | ${misses * 3} |`);
console.log(`| Queries without the cache (3 per request) | ${ok * 3} |`);
console.log(`| Cache efficiency (requests that avoided the database) | ${f(((ok - misses) / Math.max(1, ok)) * 100)}% |`);
console.log(`| Data sent | ${f(bytes / 1024 / 1024)} MB |`);

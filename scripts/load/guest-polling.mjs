// Capacity check: simulates N tables with an open order polling the way the guest UI does
// (GET /api/guest/order every 3.5 s and GET /api/guest/session every 4 s) and reports
// throughput, latency percentiles and errors. Read-only: it never places orders.
//
// Point it at a PREVIEW/STAGING deployment with a test venue, never at production unannounced:
//   LOAD_BASE_URL=https://<preview>.vercel.app LOAD_CAFE_ID=<venue uuid> LOAD_TABLES=50 LOAD_SECONDS=60 \
//     node scripts/load/guest-polling.mjs
// Each simulated table uses its own table number (T-L001, T-L002, ...); none need to exist.
const base = (process.env.LOAD_BASE_URL || '').replace(/\/$/, '');
const cafeId = process.env.LOAD_CAFE_ID || '';
const tables = Number(process.env.LOAD_TABLES || 20);
const seconds = Number(process.env.LOAD_SECONDS || 60);

if (!base || !/^[0-9a-f-]{36}$/i.test(cafeId)) {
  console.error('Set LOAD_BASE_URL and LOAD_CAFE_ID (a test venue UUID). Refusing to guess a target.');
  process.exit(2);
}

const latencies = [];
const statusCounts = new Map();
let inFlight = 0;
let peakInFlight = 0;

async function hit(path) {
  const started = performance.now();
  inFlight++;
  peakInFlight = Math.max(peakInFlight, inFlight);
  try {
    const res = await fetch(`${base}${path}`, { cache: 'no-store' });
    await res.arrayBuffer();
    statusCounts.set(res.status, (statusCounts.get(res.status) || 0) + 1);
  } catch {
    statusCounts.set('network', (statusCounts.get('network') || 0) + 1);
  } finally {
    inFlight--;
    latencies.push(performance.now() - started);
  }
}

const deadline = Date.now() + seconds * 1000;
const timers = [];
for (let i = 1; i <= tables; i++) {
  const table = `T-L${String(i).padStart(3, '0')}`;
  const q = `cafe_id=${cafeId}&table=${encodeURIComponent(table)}`;
  // stagger start so tables don't fire in lockstep
  const jitter = Math.random() * 3500;
  timers.push(setTimeout(() => {
    const poll = (path, every) => {
      const tick = async () => { if (Date.now() < deadline) { await hit(path); setTimeout(tick, every); } };
      tick();
    };
    poll(`/api/guest/order?${q}`, 3500);
    poll(`/api/guest/session?${q}&table_number=${encodeURIComponent(table)}`, 4000);
  }, jitter));
}

setTimeout(() => {
  const sorted = [...latencies].sort((a, b) => a - b);
  const pct = (p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))].toFixed(0) : 'n/a';
  const total = latencies.length;
  const errors = [...statusCounts].filter(([s]) => s === 'network' || Number(s) >= 500).reduce((n, [, c]) => n + c, 0);
  const limited = statusCounts.get(429) || 0;
  console.log(JSON.stringify({
    target: base, tables, seconds,
    requests: total,
    requestsPerSecond: Number((total / seconds).toFixed(1)),
    latencyMs: { p50: pct(50), p95: pct(95), p99: pct(99), max: sorted.at(-1)?.toFixed(0) },
    statuses: Object.fromEntries(statusCounts),
    errorRate: total ? Number((errors / total).toFixed(4)) : 0,
    rateLimited429: limited,
    peakConcurrentRequests: peakInFlight,
  }, null, 2));
  if (limited > 0) console.warn('429s seen: all simulated tables share one IP here, unlike real guests on separate phones/networks.');
  process.exit(errors / Math.max(total, 1) > 0.01 ? 1 : 0);
}, seconds * 1000 + 6000);

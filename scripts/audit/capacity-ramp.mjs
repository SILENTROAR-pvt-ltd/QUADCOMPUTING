// Capacity ramp on a deployment: how far guest reads and live pushes go before they slow down. Read-only for the venue's
// data (one no-change write per push wave: an old, already-resolved guest call is set to the status it already has).
//
//   node scripts/audit/capacity-ramp.mjs . https://www.vibersconnect.com <business_id> [T-16]
//
// A. Read ramp: 25, 50, 100, 200 guest phones read their bill at the same moment (the read every phone makes on every
//    push), three waves each. Stops early if p95 passes 4 s or more than 2% fail.
// B. Push fan-out: 50, 100, 200, 400 devices hold a live connection to the venue's floor channel (each its own
//    websocket, like real phones and tablets); one change is made and the time until each device hears it is measured.
//    Realtime peak connections count toward the plan for the month: 400 stays inside the 500 that Pro includes.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const [rootArg, base, biz, table = 'T-16'] = process.argv.slice(2);
const root = path.resolve(rootArg || '.');
const env = Object.fromEntries(fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]));
const { createClient } = createRequire(path.join(root, 'package.json'))('@supabase/supabase-js');
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const now = () => performance.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function stats(list) {
  const v = list.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return { n: 0, line: 'no samples' };
  const p = (q) => Math.round(v[Math.min(v.length - 1, Math.floor(q * (v.length - 1)))]);
  return { n: v.length, p50: p(0.5), p95: p(0.95), max: Math.round(v[v.length - 1]), line: `n=${v.length}  p50 ${p(0.5)} ms  p95 ${p(0.95)} ms  max ${Math.round(v[v.length - 1])} ms` };
}

// ── A. Read ramp ──────────────────────────────────────────────────────────────────────────────────────────────────────
console.log(`target ${base}\n\nA. guest read ramp (GET /api/guest/order, ${table})`);
const readOnce = async () => {
  const t = now();
  try {
    const res = await fetch(`${base}/api/guest/order?cafe_id=${biz}&table=${encodeURIComponent(table)}`, { cache: 'no-store' });
    await res.arrayBuffer();
    return { ms: now() - t, ok: res.ok, status: res.status };
  } catch {
    return { ms: now() - t, ok: false, status: 0 };
  }
};
const readResults = [];
for (const level of [25, 50, 100, 200]) {
  const all = [];
  for (let wave = 0; wave < 3; wave++) {
    const t = now();
    const runs = await Promise.all(Array.from({ length: level }, readOnce));
    all.push(...runs.map((r) => ({ ...r, wallMs: now() - t })));
    await sleep(1500);
  }
  const s = stats(all.map((r) => r.ms));
  const failed = all.filter((r) => !r.ok);
  const codes = [...new Set(failed.map((r) => r.status))].join(',');
  const perSec = Math.round((level * 3) / (all.reduce((m, r) => Math.max(m, r.wallMs), 0) * 3 / 1000));
  console.log(`  ${String(level).padStart(3)} at once  ${s.line}   failed ${failed.length}${codes ? ` (${codes})` : ''}   ~${perSec} reads/s`);
  readResults.push({ level, ...s, failed: failed.length });
  if (s.p95 > 4000 || failed.length / all.length > 0.02) { console.log('  stopping the read ramp: past the limit'); break; }
}

// ── B. Push fan-out ───────────────────────────────────────────────────────────────────────────────────────────────────
console.log('\nB. live push fan-out (devices on the venue floor channel)');
const { data: probeRow } = await admin.from('staff_notifications').select('id, status').eq('business_id', biz).eq('status', 'RESOLVED').order('created_at', { ascending: true }).limit(1).maybeSingle();
if (!probeRow) { console.log('  no resolved guest call to use as the change; skipping'); process.exit(0); }
const clients = [];
for (const level of [50, 100, 200, 400]) {
  // Join the extra devices at about 25 a second (well under the plan's channel-join rate).
  while (clients.length < level) {
    const batch = Math.min(25, level - clients.length);
    await Promise.all(Array.from({ length: batch }, async () => {
      const c = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
      const entry = { c, heard: null, ch: null, up: false };
      entry.ch = c.channel(`floor_${biz.toLowerCase()}`).on('broadcast', { event: 'changed' }, () => { if (entry.heard === null) entry.heard = now(); });
      await new Promise((res) => { const to = setTimeout(res, 10_000); entry.ch.subscribe((s) => { if (s === 'SUBSCRIBED') { entry.up = true; clearTimeout(to); res(); } }); });
      clients.push(entry);
    }));
    await sleep(1000);
  }
  const live = clients.filter((e) => e.up).length;
  const times = [];
  for (let wave = 0; wave < 3; wave++) {
    clients.forEach((e) => { e.heard = null; });
    const t = now();
    await admin.from('staff_notifications').update({ status: probeRow.status }).eq('id', probeRow.id);
    await sleep(3000);
    times.push(...clients.filter((e) => e.up).map((e) => (e.heard === null ? NaN : e.heard - t)));
  }
  const s = stats(times);
  const missed = times.filter((x) => !Number.isFinite(x)).length;
  console.log(`  ${String(level).padStart(3)} devices (${live} connected)  heard in ${s.line}   missed ${missed} of ${times.length}`);
}
await Promise.all(clients.map((e) => e.c.removeChannel(e.ch).catch(() => {})));
setTimeout(() => process.exit(0), 500);

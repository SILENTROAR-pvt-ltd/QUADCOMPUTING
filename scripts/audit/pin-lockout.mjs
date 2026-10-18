// Is the staff PIN lockout (5 wrong tries) enforced when the guesses arrive at the same instant?
//   node scripts/audit/pin-lockout.mjs [http://localhost:3000]     (reads .env.local; exits 1 on a finding)
// Creates a disposable venue with one staff member, fires 40 different wrong PINs in parallel (each from its own
// address, so the per-address rate limit is not what is measured), then tries the CORRECT PIN, and removes the venue.
// Pass = at most four of the guesses were compared (the fifth locks), none got in, and the correct PIN is then refused.
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { scryptSync, randomBytes } from 'node:crypto';

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const hash = (pin) => { const salt = randomBytes(16).toString('hex'); return `scrypt:${salt}:${scryptSync(pin, salt, 32).toString('hex')}`; };

const slug = `zz-pin-audit-${Date.now().toString(36)}`;
const { data: biz } = await admin.from('businesses').insert({ business_name: 'ZZ PIN Audit', name: 'ZZ PIN Audit', slug, categories: ['Cafe'] }).select('id').single();
const { data: staff } = await admin.from('staff_profiles').insert({ business_id: biz.id, name: 'ZZ Audit', role: 'WAITER', pin_hash: hash('4821'), is_pos_active: true, status: 'ACTIVE', join_date: new Date().toISOString().slice(0, 10), base_salary: 0 }).select('id').single();
let failed = false;
try {
  const attempt = (pin, n) => fetch(`${BASE}/api/auth/staff-pin`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.77.${(n >> 8) & 255}.${n & 255}` }, body: JSON.stringify({ business_id: biz.id, staff_id: staff.id, pin }) }).then(async (r) => ({ status: r.status, code: (await r.json().catch(() => ({}))).code }));
  const guesses = Array.from({ length: 40 }, (_, i) => String(1000 + i * 3));
  const out = await Promise.all(guesses.map((g, i) => attempt(g, i + 1)));
  const tally = out.reduce((a, o) => { const k = `${o.status}${o.code ? ' ' + o.code : ''}`; return { ...a, [k]: (a[k] || 0) + 1 }; }, {});
  const compared = out.filter((o) => o.code === 'WRONG').length;
  const right = await attempt('4821', 999);
  console.log('40 parallel wrong PINs ->', JSON.stringify(tally));
  console.log('then the CORRECT pin   ->', right.status, right.status === 423 ? '(locked out: correct)' : right.status === 200 ? '(SIGNED IN: the lock did not hold)' : '');
  if (compared > 4) { failed = true; console.log(`FINDING: ${compared} guesses were compared before the lock (limit 4 wrong + the locking fifth)`); }
  if (out.some((o) => o.status === 200)) { failed = true; console.log('FINDING: a guess got in'); }
  if (right.status !== 423) { failed = true; console.log('FINDING: the correct PIN was not refused after the burst'); }
} finally {
  await admin.from('staff_profiles').delete().eq('business_id', biz.id);
  await admin.from('businesses').delete().eq('id', biz.id);
}
console.log(failed ? 'FAILED' : 'PASSED: the lockout holds under a parallel burst.');
process.exit(failed ? 1 : 0);

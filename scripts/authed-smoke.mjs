import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PORT = process.env.PORT || 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const emailA = process.env.SMOKE_A_EMAIL;
const passwordA = process.env.SMOKE_A_PASSWORD;
const emailB = process.env.SMOKE_B_EMAIL;
const passwordB = process.env.SMOKE_B_PASSWORD;

async function runAuthedSmoke() {
  if (!emailA || !passwordA || !emailB || !passwordB) {
    console.log('========================================================================================');
    console.log('                          AUTHED SMOKE TEST SUITE (STAGING)                             ');
    console.log('========================================================================================');
    console.log('STATUS: UNRUN');
    console.log('REASON: Staging credentials SMOKE_A_EMAIL, SMOKE_A_PASSWORD, SMOKE_B_EMAIL, SMOKE_B_PASSWORD not configured in environment.');
    console.log('To run this test against staging, export these env vars and re-run.');
    process.exit(0);
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const supabaseA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const supabaseB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: authA, error: errA } = await supabaseA.auth.signInWithPassword({
    email: emailA,
    password: passwordA,
  });
  if (errA || !authA.session) {
    console.error('Failed to sign in as Host A:', errA?.message);
    process.exit(1);
  }

  const { data: authB, error: errB } = await supabaseB.auth.signInWithPassword({
    email: emailB,
    password: passwordB,
  });
  if (errB || !authB.session) {
    console.error('Failed to sign in as Host B:', errB?.message);
    process.exit(1);
  }

  // Fetch Host A's and Host B's business IDs
  const { data: bizA } = await supabaseA.from('businesses').select('id').eq('host_id', authA.user.id).limit(1).single();
  const { data: bizB } = await supabaseB.from('businesses').select('id').eq('host_id', authB.user.id).limit(1).single();

  const tokenA = authA.session.access_token;
  const venueB = bizB.id;

  async function authedFetch(urlPath, options = {}) {
    return fetch(`${BASE_URL}${urlPath}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
        Cookie: `sb-access-token=${tokenA}`,
        ...(options.headers || {}),
      },
    });
  }

  const tests = [
    // Positive controls
    { name: "Host A lists own tables", path: '/api/host/tables', method: 'GET', expect: [200] },
    { name: "Host A lists own catalog", path: '/api/host/catalog', method: 'GET', expect: [200] },
    // Cross-tenant injection attempts (Host A uses Host B's venueId)
    { name: "Host A calls tables with B's venueId", path: `/api/host/tables?business_id=${venueB}`, method: 'GET', expect: [403] },
    { name: "Host A calls wallet with B's venueId", path: `/api/host/wallet?business_id=${venueB}`, method: 'GET', expect: [403] },
    { name: "Host A fee with B's venueId", path: '/api/host/sessions/fee', method: 'POST', body: { venueId: venueB, action: 'bill_generate' }, expect: [403] },
    { name: "Host A venue offers with B's venueId", path: `/api/venue/offers?business_id=${venueB}`, method: 'POST', body: { title: 'attack' }, expect: [403] },
    { name: "Host A photo vault with B's venueId", path: `/api/venue/photo-vault?business_id=${venueB}`, method: 'POST', body: { title: 'attack' }, expect: [403] },
    { name: "Host A catalog with B's venueId", path: `/api/host/catalog?business_id=${venueB}`, method: 'GET', expect: [403] },
    { name: "Host A inventory with B's venueId", path: `/api/host/inventory/items?business_id=${venueB}`, method: 'GET', expect: [403] },
    { name: "Host A rooms with B's venueId", path: `/api/host/accommodations/rooms?business_id=${venueB}`, method: 'GET', expect: [403] },
    // Admin check: Non-admin calling /api/admin/*
    { name: "Host A (non-admin) calls admin topup-requests", path: '/api/admin/topup-requests', method: 'GET', expect: [403] },
  ];

  console.log('========================================================================================');
  console.log('                          AUTHED SMOKE TEST RESULTS                                     ');
  console.log('========================================================================================');
  console.log('| ' + 'Test Name'.padEnd(52) + ' | ' + 'Status'.padEnd(6) + ' | ' + 'HTTP'.padEnd(5) + ' |');
  console.log('|-' + '-'.repeat(52) + '-|-' + '-'.repeat(6) + '-|-' + '-'.repeat(5) + '-|');

  let failed = 0;
  for (const t of tests) {
    const res = await authedFetch(t.path, {
      method: t.method,
      body: t.body ? JSON.stringify(t.body) : undefined,
    });
    const pass = t.expect.includes(res.status);
    if (!pass) failed++;
    console.log(`| ${t.name.padEnd(52)} | ${(pass ? 'PASS' : 'FAIL').padEnd(6)} | ${String(res.status).padEnd(5)} |`);
  }

  console.log('========================================================================================');
  if (failed > 0) {
    console.error(`FAILED: ${failed} authed test(s) failed`);
    process.exit(1);
  } else {
    console.log('SUCCESS: All authed isolation and permission checks passed.');
    process.exit(0);
  }
}

runAuthedSmoke().catch(e => {
  console.error(e);
  process.exit(1);
});

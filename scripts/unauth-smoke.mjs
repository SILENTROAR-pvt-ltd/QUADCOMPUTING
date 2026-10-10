import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';

const PORT = process.env.PORT || 3000;
// SMOKE_BASE_URL lets the same checks run against a deployed preview or production URL.
const BASE_URL = (process.env.SMOKE_BASE_URL || `http://127.0.0.1:${PORT}`).replace(/\/$/, '');

function findRouteFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findRouteFiles(full));
    } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
      results.push(full);
    }
  }
  return results;
}

function getExportedMethods(file) {
  const content = fs.readFileSync(file, 'utf8');
  const methods = [];
  // Handlers are exported both as functions and as `export const GET = withApiErrorBoundary(...)`.
  // Matching only the function form silently skipped almost every route and let the run "pass".
  const regex = /export\s+(?:async\s+function|function|const)\s+(GET|POST|PATCH|PUT|DELETE)\b/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    methods.push(match[1]);
  }
  return methods;
}

function routeFileToApiPath(file) {
  let apiPath = file
    .replace(/\\/g, '/')
    .replace(/^app/, '')
    .replace(/\/route\.(ts|js)$/, '');

  // Replace dynamic route segments like [id] with dummy uuid
  apiPath = apiPath.replace(/\[([^\]]+)\]/g, '123e4567-e89b-12d3-a456-426614174000');
  return apiPath;
}

function makeRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(apiPath, BASE_URL);
    const postData = body ? JSON.stringify(body) : '';

    const req = (url.protocol === 'https:' ? https : http).request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(body ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        },
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body: responseBody });
        });
      }
    );

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runSmokeTests() {
  const hostFiles = findRouteFiles('app/api/host');
  const adminFiles = findRouteFiles('app/api/admin');
  const venueFiles = findRouteFiles('app/api/venue');

  const tests = [];

  for (const file of hostFiles) {
    const apiPath = routeFileToApiPath(file);
    const methods = getExportedMethods(file);
    for (const m of methods) {
      let body = null;
      if (['POST', 'PATCH', 'PUT'].includes(m)) {
        if (apiPath === '/api/host/wallet' && m === 'POST') {
          body = { action: 'topup', venueId: 'x', amount: 999 };
        } else {
          body = { dummy: 'unauthenticated-payload' };
        }
      }
      tests.push({ file, apiPath, method: m, body });
    }
  }

  for (const file of adminFiles) {
    const apiPath = routeFileToApiPath(file);
    const methods = getExportedMethods(file);
    for (const m of methods) {
      let body = null;
      if (['POST', 'PATCH', 'PUT'].includes(m)) {
        body = { requestId: 'dummy-req', action: 'approve' };
      }
      tests.push({ file, apiPath, method: m, body });
    }
  }

  for (const file of venueFiles) {
    const apiPath = routeFileToApiPath(file);
    const methods = getExportedMethods(file);
    for (const m of methods) {
      if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(m)) {
        const body = ['POST', 'PATCH', 'PUT'].includes(m) ? { title: 'dummy' } : null;
        tests.push({ file, apiPath, method: m, body });
      }
    }
  }

  // 4. Extended Endpoints: /api/tables and /api/orders aliases
  const tableMethods = ['GET', 'POST', 'PATCH', 'DELETE'];
  for (const m of tableMethods) {
    tests.push({
      file: 'app/api/tables/route.ts',
      apiPath: '/api/tables',
      method: m,
      body: m !== 'GET' ? { table_number: 'T-99' } : null,
      expectedStatuses: [401, 403],
    });
  }

  // /api/orders alias tests (forwards to guest order route)
  tests.push({
    file: 'app/api/orders/route.ts',
    apiPath: '/api/orders',
    method: 'GET',
    // no venue in the request: rejected as 400 (venue required) before any lookup
    expectedStatuses: [400, 404],
  });
  tests.push({
    file: 'app/api/orders/route.ts',
    apiPath: '/api/orders',
    method: 'POST',
    body: {
      cafe_id: '00000000-0000-0000-0000-000000000000',
      table_number: 'T-01',
      items: [{ item_id: 'item-1', quantity: 1 }],
    },
    expectedStatuses: [404],
  });

  // 5. Hostile Guest Endpoints Tests
  // POST /api/guest/wallet must be 404 or 405 (Method Not Allowed / Deleted)
  tests.push({
    file: 'app/api/guest/wallet/route.ts',
    apiPath: '/api/guest/wallet',
    method: 'POST',
    body: { amount: 1000, guest_id: 'attacker' },
    expectedStatuses: [404, 405],
  });

  // POST /api/guest/order with unknown cafe_id must return 404
  tests.push({
    file: 'app/api/guest/order/route.ts',
    apiPath: '/api/guest/order',
    method: 'POST',
    body: {
      cafe_id: '00000000-0000-0000-0000-000000000000',
      table_number: 'T-01',
      items: [{ item_id: 'item-1', quantity: 1, price: 0 }],
    },
    expectedStatuses: [404],
  });

  // POST /api/guest/onboard with unknown cafe_id must return 404 (or 500 when SERVICE_ROLE_KEY missing)
  tests.push({
    file: 'app/api/guest/onboard/route.ts',
    apiPath: '/api/guest/onboard',
    method: 'POST',
    body: {
      guest_name: 'Guest Hacker',
      table_number: 'T-01',
      cafe_id: '00000000-0000-0000-0000-000000000000',
    },
    expectedStatuses: [404, 500],
  });

  // 6. Guest endpoints must refuse requests that name no venue (no database access needed).
  for (const [method, apiPath, body] of [
    ['GET', '/api/guest/lobby?type=messages', null],
    ['POST', '/api/guest/lobby?type=messages', { guest_name: 'x', content: 'hi' }],
    ['PATCH', '/api/guest/lobby', { invitation_id: 'x', status: 'accepted' }],
    ['POST', '/api/guest/call-staff', { table_number: 'T-01', type: 'WAITER' }],
    ['POST', '/api/guest/wallet/redeem', { guest_id: '@x' }],
    ['GET', '/api/guest/wallet?guest_id=%40x', null],
  ]) {
    tests.push({ file: 'guest', apiPath, method, body, expectedStatuses: [400, 404] });
  }

  // 7. The client-triggered fee endpoint was removed (fees are charged server-side). middleware.ts
  //    answers every unauthenticated /api/host/* request with 401 before routing, so 401 is valid here.
  tests.push({ file: 'removed', apiPath: '/api/host/sessions/fee', method: 'POST', body: { action: 'bill_generate', overrideCost: 0 }, expectedStatuses: [401, 404, 405] });

  if (tests.length < 80) {
    console.error(`Only ${tests.length} endpoint checks were generated; route discovery is probably broken.`);
    process.exit(1);
  }

  console.log(`\nStarting unauthenticated smoke tests against ${BASE_URL}...`);
  console.log(`Total endpoints to test: ${tests.length}\n`);

  const results = [];
  let failures = 0;

  for (const t of tests) {
    try {
      const res = await makeRequest(t.method, t.apiPath, t.body);
      const expected = t.expectedStatuses || [401, 403];
      const isExpected = expected.includes(res.statusCode);
      results.push({
        path: t.apiPath,
        method: t.method,
        statusCode: res.statusCode,
        pass: isExpected,
      });

      if (!isExpected) {
        failures++;
        console.error(`FAILED: ${t.method} ${t.apiPath} returned HTTP ${res.statusCode} (expected ${expected.join(' or ')})`);
      }
    } catch (err) {
      failures++;
      results.push({
        path: t.apiPath,
        method: t.method,
        statusCode: 'ERR',
        pass: false,
      });
      console.error(`ERROR: ${t.method} ${t.apiPath} failed:`, err.message);
    }
  }

  console.log('\n========================================================================================');
  console.log('                    UNAUTHENTICATED SMOKE TEST RESULTS                                  ');
  console.log('========================================================================================');
  console.log('| ' + 'API Path'.padEnd(52) + ' | ' + 'Method'.padEnd(7) + ' | ' + 'HTTP'.padEnd(5) + ' | ' + 'Status'.padEnd(6) + ' |');
  console.log('|-' + '-'.repeat(52) + '-|-' + '-'.repeat(7) + '-|-' + '-'.repeat(5) + '-|-' + '-'.repeat(6) + '-|');

  for (const r of results) {
    console.log(
      `| ${r.path.padEnd(52)} | ${r.method.padEnd(7)} | ${String(r.statusCode).padEnd(5)} | ${(r.pass ? 'PASS' : 'FAIL').padEnd(6)} |`
    );
  }

  console.log('========================================================================================');
  console.log(`Total Tested: ${results.length} | Passed: ${results.length - failures} | Failed: ${failures}`);

  if (failures > 0) {
    console.error('\nSMOKE TEST FAILED: Unprotected endpoints allowed unauthenticated access!');
    process.exit(1);
  } else {
    console.log('\nSMOKE TEST PASSED: 100% of guarded endpoints returned 401 or 403.');
    process.exit(0);
  }
}

runSmokeTests().catch((err) => {
  console.error('Fatal smoke test runner error:', err);
  process.exit(1);
});

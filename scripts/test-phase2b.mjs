import assert from 'node:assert';
import { checkVenueBillingGuard, assertVenueBillingAllowed } from '../lib/services/billing/venue-guard.service.js';

console.log('================================================================');
console.log('       PHASE 2B: SUBSCRIPTION BILLING & VENUE GUARD TEST        ');
console.log('================================================================');

async function runTests() {
  let passed = 0;
  let failed = 0;

  // TEST 1: Negative wallet balance triggers 402 with code 'venue_suspended'
  console.log('\n[Test 1] Venue with negative wallet balance (balance < 0)');
  {
    const mockNegativeClient = {
      from: (table) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => {
              if (table === 'venue_wallets') {
                return { data: { venue_id: 'test-venue-neg-1', balance: -50.00, currency: 'INR' }, error: null };
              }
              if (table === 'venue_subscriptions') {
                return { data: { venue_id: 'test-venue-neg-1', status: 'active', plan_tier: 'pay_as_you_go' }, error: null };
              }
              return { data: null, error: null };
            },
          }),
        }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        insert: () => Promise.resolve({ error: null }),
      }),
    };

    const res = await checkVenueBillingGuard('test-venue-neg-1', mockNegativeClient);
    console.log('checkVenueBillingGuard result:', JSON.stringify(res, null, 2));

    assert.strictEqual(res.allowed, false, 'Expected allowed to be false');
    assert.strictEqual(res.status, 402, 'Expected status code 402');
    assert.strictEqual(res.code, 'venue_suspended', 'Expected code to be venue_suspended');
    assert.strictEqual(res.details.suspended, true, 'Expected suspended flag to be true');
    console.log('✓ PASS: Negative balance blocked with status 402 and code venue_suspended');
    passed++;

    // Test assertVenueBillingAllowed returns actual 402 NextResponse
    const httpRes = await assertVenueBillingAllowed('test-venue-neg-1', mockNegativeClient);
    assert.ok(httpRes, 'Expected HTTP response object');
    assert.strictEqual(httpRes.status, 402, 'Expected HTTP 402 response');
    const jsonBody = await httpRes.json();
    console.log('HTTP 402 JSON response:', JSON.stringify(jsonBody, null, 2));
    assert.strictEqual(jsonBody.code, 'venue_suspended', 'Expected JSON body code: venue_suspended');
    console.log('✓ PASS: assertVenueBillingAllowed produced HTTP 402 JSON with venue_suspended');
    passed++;
  }

  // TEST 2: Inactive/expired subscription status triggers 402 with code 'venue_suspended'
  console.log('\n[Test 2] Venue with expired subscription status');
  {
    const mockExpiredClient = {
      from: (table) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => {
              if (table === 'venue_wallets') {
                return { data: { venue_id: 'test-venue-exp-2', balance: 100.00, currency: 'INR' }, error: null };
              }
              if (table === 'venue_subscriptions') {
                return { data: { venue_id: 'test-venue-exp-2', status: 'expired', plan_tier: '8k_2m' }, error: null };
              }
              return { data: null, error: null };
            },
          }),
        }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        insert: () => Promise.resolve({ error: null }),
      }),
    };

    const res = await checkVenueBillingGuard('test-venue-exp-2', mockExpiredClient);
    console.log('Expired subscription result:', JSON.stringify(res, null, 2));

    assert.strictEqual(res.allowed, false, 'Expected allowed to be false');
    assert.strictEqual(res.status, 402, 'Expected status code 402');
    assert.strictEqual(res.code, 'venue_suspended', 'Expected code venue_suspended');
    console.log('✓ PASS: Inactive subscription blocked with status 402 and code venue_suspended');
    passed++;
  }

  // TEST 3: Healthy venue with balance >= 0 and active subscription allowed
  console.log('\n[Test 3] Healthy venue with balance >= 0 and active subscription');
  {
    const mockHealthyClient = {
      from: (table) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => {
              if (table === 'venue_wallets') {
                return { data: { venue_id: 'test-venue-ok-3', balance: 250.00, currency: 'INR' }, error: null };
              }
              if (table === 'venue_subscriptions') {
                return { data: { venue_id: 'test-venue-ok-3', status: 'active', plan_tier: 'pay_as_you_go' }, error: null };
              }
              return { data: null, error: null };
            },
          }),
        }),
      }),
    };

    const res = await checkVenueBillingGuard('test-venue-ok-3', mockHealthyClient);
    assert.strictEqual(res.allowed, true, 'Expected allowed to be true');
    assert.strictEqual(res.status, 200, 'Expected status code 200');
    assert.strictEqual(res.details.suspended, false, 'Expected suspended flag to be false');
    console.log('✓ PASS: Healthy venue allowed through');
    passed++;

    const httpRes = await assertVenueBillingAllowed('test-venue-ok-3', mockHealthyClient);
    assert.strictEqual(httpRes, null, 'Expected null when allowed');
    console.log('✓ PASS: assertVenueBillingAllowed returned null (no rejection)');
    passed++;
  }

  // TEST 4: Top-Up Approval Service executes successfully
  console.log('\n[Test 4] Top-Up approval workflow execution');
  {
    const { approveTopupRequest } = await import('../lib/services/wallet/topup-request-approval.service.js');
    const mockTopupReq = {
      id: '00000000-0000-0000-0000-000000000099',
      venue_id: 'test-venue-ok-3',
      amount: 500.00,
      utr_number: 'UTR9988776655',
      status: 'pending',
      requested_plan_tier: 'pay_as_you_go',
    };

    const mockAdminDb = {
      from: (table) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: mockTopupReq, error: null }),
          }),
        }),
        update: () => ({
          eq: async () => ({ data: null, error: null }),
        }),
        insert: () => Promise.resolve({ error: null }),
      }),
      rpc: async (fn, params) => {
        if (fn === 'approve_topup_request') {
          return {
            data: {
              success: true,
              request_id: params.p_request_id,
              credited_amount: 500.00,
              new_balance: 750.00,
              plan_updated: false,
            },
            error: null,
          };
        }
        return { data: null, error: new Error('Unknown RPC') };
      },
    };

    // Test approveTopupRequest invocation
    const approvalRes = await approveTopupRequest(mockAdminDb, mockTopupReq.id, 'super-admin');
    console.log('Approval result:', JSON.stringify(approvalRes, null, 2));
    assert.strictEqual(approvalRes.success, true, 'Expected success to be true');
    assert.strictEqual(approvalRes.credited_amount, 500.00, 'Expected credited amount 500');
    console.log('✓ PASS: Top-up approval executed and credited wallet');
    passed++;
  }

  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

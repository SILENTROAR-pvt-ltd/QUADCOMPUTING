import { checkVenueBillingGuard, assertVenueBillingAllowed } from '../lib/services/billing/venue-guard.service.js';

async function testNegativeBalanceOrderSubmission() {
  console.log('[Acceptance Test] Submitting order for venue with negative wallet balance (balance < 0)...');
  
  const mockNegativeVenueClient = {
    from: (table) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (table === 'venue_wallets') {
              return { data: { venue_id: 'venue-neg-999', balance: -45.50, currency: 'INR' }, error: null };
            }
            if (table === 'venue_subscriptions') {
              return { data: { venue_id: 'venue-neg-999', status: 'active', plan_tier: 'pay_as_you_go' }, error: null };
            }
            return { data: null, error: null };
          },
        }),
      }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      insert: () => Promise.resolve({ error: null }),
    }),
  };

  // Run the guard that protects order submissions
  const httpResponse = await assertVenueBillingAllowed('venue-neg-999', mockNegativeVenueClient);
  const status = httpResponse.status;
  const json = await httpResponse.json();

  console.log('HTTP Status Code:', status);
  console.log('Response Body:', JSON.stringify(json, null, 2));

  if (status === 402 && json.code === 'venue_suspended') {
    console.log('\nSUCCESS: Negative balance venue order submission returned HTTP 402 with code: venue_suspended');
    process.exit(0);
  } else {
    console.error('FAILED: Did not return expected 402 with venue_suspended');
    process.exit(1);
  }
}

testNegativeBalanceOrderSubmission();

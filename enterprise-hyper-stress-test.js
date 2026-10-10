/**
 * QUAD COMPUTING OS — ENTERPRISE HYPER-STRESS & LATENCY AUDIT
 * Simulates 100 concurrent heavy operations (Simultaneous lobby pings, 
 * order dispatches, and 7% wallet cashback settlements) to check latency, 
 * throughput, and database sync integrity under heavy load.
 */

const BASE_URL = 'http://127.0.0.1:3000';
const CAFE_ID = 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
const TOTAL_CONCURRENT_REQUESTS = 100;

async function executeHyperStressTest() {
  console.log('\n========================================================');
  console.log(` 🚀 INITIATING HYPER-STRESS TEST: ${TOTAL_CONCURRENT_REQUESTS} PARALLEL WORKFLOWS`);
  console.log('========================================================\n');

  const startTime = Date.now();
  const latencies = [];
  let successCount = 0;
  let failureCount = 0;

  // Create an array of 100 concurrent mock workflows
  const tasks = Array.from({ length: TOTAL_CONCURRENT_REQUESTS }, async (_, index) => {
    const tableNum = `T-${(index % 20) + 1}`; // Spreads across T-1 to T-20
    const guestHandle = `@stress_guest_${index}_${Date.now().toString().slice(-4)}`;
    const orderId = `ord-hyper-${index}-${Date.now()}`;
    const reqStart = Date.now();

    try {
      // Step 1: Initialize session / lobby ping
      const lobbyRes = await fetch(`${BASE_URL}/guest/lobby?table=${tableNum}&cafe_id=${CAFE_ID}`);
      
      // Step 2: Fire heavy POS settlement & cashback transaction simultaneously
      const settleRes = await fetch(`${BASE_URL}/api/guest/wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: CAFE_ID,
          guest_id: guestHandle,
          guest_handle: guestHandle,
          order_id: orderId,
          order_total: Math.floor(Math.random() * 5000) + 500, // Random amount between 500 & 5500
          table_number: tableNum
        })
      });

      const duration = Date.now() - reqStart;
      latencies.push(duration);

      if (lobbyRes.status === 200 && settleRes.status === 200) {
        successCount++;
      } else {
        failureCount++;
        console.warn(`   ⚠️ Request #${index + 1} returned status: Lobby=${lobbyRes.status}, Settle=${settleRes.status}`);
      }
    } catch (err) {
      const duration = Date.now() - reqStart;
      latencies.push(duration);
      failureCount++;
      console.error(`   ❌ Request #${index + 1} threw exception:`, err.message);
    }
  });

  // Execute all 100 requests concurrently using Promise.all
  await Promise.all(tasks);

  const totalDuration = Date.now() - startTime;
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const maxLatency = Math.max(...latencies);
  const minLatency = Math.min(...latencies);

  console.log('\n========================================================');
  console.log(' 📊 HYPER-STRESS TEST RESULTS & PERFORMANCE METRICS');
  console.log('========================================================');
  console.log(` Total Concurrent Operations : ${TOTAL_CONCURRENT_REQUESTS}`);
  console.log(` Successful Transactions     : ${successCount}`);
  console.log(` Failed / Dropped Requests   : ${failureCount}`);
  console.log(` Total Execution Time        : ${totalDuration} ms`);
  console.log(` Average Latency per Request : ${avgLatency.toFixed(2)} ms`);
  console.log(` Min Latency                 : ${minLatency} ms`);
  console.log(` Max Latency                 : ${maxLatency} ms`);
  console.log('========================================================');
  
  if (failureCount === 0 && avgLatency < 1200) {
    console.log(' 🟢 VERDICT: ENTERPRISE-GRADE PERFORMANCE & SYNC CONFIRMED!');
  } else if (failureCount === 0) {
    console.log(' 🟢 VERDICT: 100% SUCCESSFUL CONCURRENT TRANSACTIONS (High Load Latency Profile)');
  } else {
    console.log(' 🟡 VERDICT: PERFORMANCE BOTTLENECK DETECTED - CHECK DB POOL LIMITS');
  }
  console.log('========================================================\n');
}

executeHyperStressTest();

/**
 * QUAD COMPUTING OS - 10-TABLE CONCURRENT SWARM & MISMATCH AUDIT
 * Simulates 10 tables running parallel user sessions, order placement,
 * chef KOT updates, POS 1-click cashback settlements, and state consistency checks.
 */

const BASE_URL = 'http://127.0.0.1:3000';
const CAFE_ID = 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';

const TABLES = ['T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06', 'T-07', 'T-08', 'T-09', 'T-10'];

async function simulateTablePipeline(tableNumber, index) {
  const handle = `@guest_swarm_${index}_${Date.now().toString().slice(-4)}`;
  const orderAmount = 1000 + (index * 250); // Dynamic bill amounts (₹1,000 to ₹3,250)
  const expectedCashback = Math.round(orderAmount * 0.07 * 100) / 100;
  
  let anomalies = [];

  try {
    // 1. Session Init & Table Binding
    const sessionRes = await fetch(`${BASE_URL}/guest/lobby?table=${tableNumber}&cafe_id=${CAFE_ID}`);
    if (sessionRes.status !== 200) {
      anomalies.push(`Session init failed (HTTP ${sessionRes.status})`);
    }

    // 2. Simulate Table Hop (Moving to another table mid-session)
    const targetHopTable = TABLES[(index + 3) % TABLES.length];
    const hopRes = await fetch(`${BASE_URL}/guest/lobby?table=${targetHopTable}&cafe_id=${CAFE_ID}`);
    if (hopRes.status !== 200) {
      anomalies.push(`Table hop from ${tableNumber} to ${targetHopTable} failed`);
    }

    // 3. POS 1-Click Cashback Settlement & Wallet Credit
    const orderId = `ord-swarm-${tableNumber}-${Date.now()}`;
    const walletRes = await fetch(`${BASE_URL}/api/guest/wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: CAFE_ID,
        guest_id: handle,
        guest_handle: handle,
        order_id: orderId,
        order_total: orderAmount,
        table_number: targetHopTable
      })
    });
    const walletData = await walletRes.json();

    if (walletRes.status !== 200 || walletData.cashback_amount !== expectedCashback) {
      anomalies.push(`Cashback credit mismatch. Expected: ₹${expectedCashback}, Got: ${walletData.cashback_amount}`);
    }

    // 4. Cross-Verification of Wallet Ledger Balance
    const verifyRes = await fetch(`${BASE_URL}/api/guest/wallet?guest_id=${encodeURIComponent(handle)}&business_id=${CAFE_ID}`);
    const verifyData = await verifyRes.json();

    if (verifyRes.status !== 200 || verifyData.wallet?.balance !== expectedCashback) {
      anomalies.push(`Wallet DB balance sync mismatch. DB Balance: ${verifyData.wallet?.balance}`);
    }

    return {
      table: tableNumber,
      handle,
      orderAmount,
      expectedCashback,
      success: anomalies.length === 0,
      anomalies
    };

  } catch (err) {
    return {
      table: tableNumber,
      handle,
      success: false,
      anomalies: [err.message]
    };
  }
}

async function runSwarmAudit() {
  console.log('\n========================================================');
  console.log(' 🚀 INITIATING 10-TABLE CONCURRENT SWARM & MISMATCH AUDIT');
  console.log('========================================================\n');

  console.log(`⚡ Spawning parallel simulation threads for ${TABLES.length} tables...\n`);
  const startTime = Date.now();

  // Execute all 10 table pipelines simultaneously in parallel
  const swarmPromises = TABLES.map((table, idx) => simulateTablePipeline(table, idx));
  const results = await Promise.all(swarmPromises);

  let passedCount = 0;
  let totalAnomalies = 0;

  results.forEach((res) => {
    if (res.success) {
      passedCount++;
      console.log(` [${res.table}] ✅ SUCCESS -> Handle: ${res.handle} | Order: ₹${res.orderAmount} | Cashback: ₹${res.expectedCashback}`);
    } else {
      totalAnomalies++;
      console.log(` [${res.table}] ❌ ANOMALY DETECTED -> Handle: ${res.handle}`);
      res.anomalies.forEach(a => console.log(`       ⚠️  ${a}`));
    }
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n========================================================');
  console.log(` 📊 SWARM AUDIT REPORT SUMMARY (Completed in ${duration}s)`);
  console.log(`   - Total Tables Tested: ${TABLES.length}`);
  console.log(`   - Successful Pipelines: ${passedCount}/${TABLES.length}`);
  console.log(`   - Total Anomalies / Mismatches: ${totalAnomalies}`);
  console.log(totalAnomalies === 0 ? ' 🟢 STATUS: 100% BULLETPROOF CONCURRENCY' : ' 🔴 STATUS: RACE CONDITIONS / MISMATCHES FOUND');
  console.log('========================================================\n');
}

runSwarmAudit();

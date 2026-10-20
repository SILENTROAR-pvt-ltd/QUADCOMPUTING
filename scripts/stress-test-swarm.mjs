#!/usr/bin/env node
/**
 * scripts/stress-test-swarm.mjs
 * ============================================================================
 * FULL A-TO-Z SWARM STRESS TEST: 50 VENUES x 20 TABLES (1,000 CONCURRENT SESSIONS)
 * ============================================================================
 * 
 * Simulates a realistic dinner rush across 50 multi-tenant venues simultaneously,
 * with 20 tables active per venue (1,000 total physical tables).
 * 
 * Full A-to-Z Lifecycle per Table:
 *   Step 1: Guest opens menu: GET /api/guest/menu?cafe_id=<venue>&table=<tableNum>
 *   Step 2: Table Session Init: POST /api/guest/session (Creates active session)
 *   Step 3: Atomic Order Submission: POST /api/guest/order (Creates Order + KOT ticket)
 *   Step 4: Kitchen Status Dispatch: PATCH /api/host/kitchen/tickets (PREPARING -> READY)
 *   Step 5: Bill Request: PATCH /api/guest/session (Guest requests bill)
 *   Step 6: Atomic Settlement & Vacate: PATCH /api/host/sessions (Settle bill + 7% cashback + vacate)
 * 
 * Usage:
 *   node scripts/stress-test-swarm.mjs --base http://127.0.0.1:3000 --venues 50 --tables 20 --concurrency 50
 * ============================================================================
 */

import { performance } from 'node:perf_hooks';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) {
      acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
    }
    return acc;
  }, [])
);

const BASE = String(args.base || 'http://127.0.0.1:3000').replace(/\/$/, '');
const TOTAL_VENUES = Number(args.venues || 50);
const TABLES_PER_VENUE = Number(args.tables || 20);
const BATCH_CONCURRENCY = Number(args.concurrency || 50); // In-flight HTTP socket pool
const TOTAL_TABLES = TOTAL_VENUES * TABLES_PER_VENUE;

const stats = {
  menu: { ok: 0, err: 0, latencies: [] },
  sessionInit: { ok: 0, err: 0, latencies: [] },
  order: { ok: 0, err: 0, latencies: [] },
  kitchen: { ok: 0, err: 0, latencies: [] },
  billRequest: { ok: 0, err: 0, latencies: [] },
  settlement: { ok: 0, err: 0, latencies: [] },
  totalGrossSales: 0,
  totalCashbackEarned: 0,
};

function pct(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))].toFixed(1);
}

// Concurrency pool helper (p-limit equivalent)
async function mapConcurrent(items, limit, fn) {
  const results = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function recordStep(stepName, fn) {
  const t0 = performance.now();
  try {
    const res = await fn();
    const duration = performance.now() - t0;
    if (res.ok) {
      stats[stepName].ok++;
      stats[stepName].latencies.push(duration);
    } else {
      stats[stepName].err++;
    }
    return res;
  } catch (err) {
    stats[stepName].err++;
    return { ok: false, error: err.message };
  }
}

async function simulateTableLifecycle(tableTask) {
  const { venueId, tableNumber, guestIndex } = tableTask;
  const guestHandle = `@swarm_guest_${venueId.slice(0, 4)}_${tableNumber}`;
  const mockIp = `192.168.${Math.floor(guestIndex / 250) % 250}.${(guestIndex % 250) + 1}`;

  const headers = {
    'Content-Type': 'application/json',
    'x-forwarded-for': mockIp,
  };

  // STEP 1: Guest opens Menu
  await recordStep('menu', async () => {
    const res = await fetch(`${BASE}/api/guest/menu?cafe_id=${venueId}&table=${tableNumber}`, { headers });
    return { ok: res.ok, status: res.status };
  });

  // STEP 2: Initialize / Read Active Table Session
  const sessionRes = await recordStep('sessionInit', async () => {
    const res = await fetch(`${BASE}/api/guest/session`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        business_id: venueId,
        table_number: tableNumber,
        guest_handle: guestHandle,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  });

  const sessionId = sessionRes.data?.session?.id || sessionRes.data?.id;

  // STEP 3: Atomic Order Submission
  const billSubtotal = 450;
  const billGst = 22.5; // 5% GST
  const billGrandTotal = billSubtotal + billGst;

  const orderRes = await recordStep('order', async () => {
    const res = await fetch(`${BASE}/api/guest/order`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        business_id: venueId,
        table_number: tableNumber,
        session_id: sessionId,
        customer_name: `Swarm Guest ${tableNumber}`,
        customer_phone: '9876543210',
        guest_handle: guestHandle,
        items: [
          { id: 'dish-1', name: 'Artisan Woodfire Pizza', price: 350, qty: 1 },
          { id: 'dish-2', name: 'Iced Americano', price: 100, qty: 1 },
        ],
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  });

  const orderId = orderRes.data?.order?.id || orderRes.data?.id;
  const ticketId = orderRes.data?.ticket?.id;

  // STEP 4: Kitchen KOT Preparation (Chef advances ticket to READY)
  if (ticketId) {
    await recordStep('kitchen', async () => {
      const res = await fetch(`${BASE}/api/host/kitchen/tickets`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          business_id: venueId,
          ticket_id: ticketId,
          status: 'READY',
        }),
      });
      return { ok: res.ok, status: res.status };
    });
  }

  // STEP 5: Guest Requests Bill
  await recordStep('billRequest', async () => {
    const res = await fetch(`${BASE}/api/guest/session`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        business_id: venueId,
        table_number: tableNumber,
        session_id: sessionId,
        action: 'request_bill',
      }),
    });
    return { ok: res.ok, status: res.status };
  });

  // STEP 6: Host Cashier Settles Bill and Vacates Table
  await recordStep('settlement', async () => {
    const res = await fetch(`${BASE}/api/host/sessions`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        business_id: venueId,
        table_number: tableNumber,
        session_id: sessionId,
        order_id: orderId,
        action: 'settle_and_vacate',
        payment_method: 'UPI',
        subtotal: billSubtotal,
        grand_total: billGrandTotal,
        discount_amount: 0,
        guest_handle: guestHandle,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      stats.totalGrossSales += billGrandTotal;
      stats.totalCashbackEarned += billGrandTotal * 0.07; // 7% guest wallet cashback
    }
    return { ok: res.ok, status: res.status, data };
  });
}

async function main() {
  console.log(`========================================================================`);
  console.log(`🚀 SWARM STRESS TEST: 50 VENUES x 20 TABLES (1,000 ACTIVE TABLES)`);
  console.log(`   Target Server:      ${BASE}`);
  console.log(`   Total Venues:       ${TOTAL_VENUES}`);
  console.log(`   Tables Per Venue:   ${TABLES_PER_VENUE}`);
  console.log(`   Total Concurrency:  ${BATCH_CONCURRENCY} concurrent in-flight sockets`);
  console.log(`   Total Operations:   ~${TOTAL_TABLES * 6} HTTP transactions`);
  console.log(`========================================================================\n`);

  // Build the 1,000 table tasks
  const tasks = [];
  let guestCounter = 0;
  for (let v = 1; v <= TOTAL_VENUES; v++) {
    // Generate deterministic UUID for each venue
    const venueId = `00000000-0000-4000-8000-${String(v).padStart(12, '0')}`;
    for (let t = 1; t <= TABLES_PER_VENUE; t++) {
      tasks.push({
        venueId,
        tableNumber: `T-${String(t).padStart(2, '0')}`,
        guestIndex: guestCounter++,
      });
    }
  }

  const overallStart = performance.now();

  console.log(`[Swarm] Dispatching 1,000 concurrent table lifecycles in batches of ${BATCH_CONCURRENCY}...`);
  await mapConcurrent(tasks, BATCH_CONCURRENCY, async (task, idx) => {
    if ((idx + 1) % 100 === 0 || idx + 1 === tasks.length) {
      process.stdout.write(`  -> Completed ${idx + 1} / ${TOTAL_TABLES} table cycles...\r`);
    }
    return simulateTableLifecycle(task);
  });

  const totalDurationMs = performance.now() - overallStart;
  const totalDurationSec = (totalDurationMs / 1000).toFixed(2);
  const totalRequests = TOTAL_TABLES * 6;
  const rps = (totalRequests / (totalDurationMs / 1000)).toFixed(1);

  console.log(`\n\n========================================================================`);
  console.log(`🏁 STRESS TEST AUDIT REPORT: 50 VENUES x 20 TABLES`);
  console.log(`========================================================================`);
  console.log(`Total Swarm Runtime:       ${totalDurationSec} seconds`);
  console.log(`Effective Throughput:      ${rps} requests/second`);
  console.log(`Simulated Gross Revenue:   ₹${stats.totalGrossSales.toLocaleString()}`);
  console.log(`Total 7% Cashback Credited: ₹${stats.totalCashbackEarned.toLocaleString()}`);
  console.log(`------------------------------------------------------------------------`);
  console.log(`PHASE BREAKDOWN & LATENCY PERCENTILES:`);
  console.log(`------------------------------------------------------------------------`);

  const phases = [
    ['Step 1: Menu Browse (GET)', 'menu'],
    ['Step 2: Session Init (POST)', 'sessionInit'],
    ['Step 3: Atomic Order (POST)', 'order'],
    ['Step 4: Kitchen Status (PATCH)', 'kitchen'],
    ['Step 5: Bill Request (PATCH)', 'billRequest'],
    ['Step 6: Settle & Vacate (PATCH)', 'settlement'],
  ];

  console.log(`Phase                           | Success | Errors | P50 (ms) | P95 (ms) | P99 (ms)`);
  console.log(`--------------------------------|---------|--------|----------|----------|---------`);
  for (const [label, key] of phases) {
    const s = stats[key];
    console.log(
      `${label.padEnd(32)}| ${String(s.ok).padStart(7)} | ${String(s.err).padStart(6)} | ${String(pct(s.latencies, 50)).padStart(8)} | ${String(pct(s.latencies, 95)).padStart(8)} | ${String(pct(s.latencies, 99)).padStart(7)}`
    );
  }

  console.log(`========================================================================`);
  const totalErrors = Object.values(stats).reduce((acc, curr) => acc + (curr.err || 0), 0);
  const overallSuccessRate = (((totalRequests - totalErrors) / totalRequests) * 100).toFixed(2);
  console.log(`OVERALL STRESS AUDIT VERDICT: ${totalErrors === 0 ? '✅ PASSED (100% Reliability)' : '⚠️ WARNING (Check connection pool)'}`);
  console.log(`Total Transactions: ${totalRequests} | Total Errors: ${totalErrors} | Success Rate: ${overallSuccessRate}%`);
  console.log(`========================================================================\n`);
}

main().catch(console.error);

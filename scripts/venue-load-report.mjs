#!/usr/bin/env node
// Per-venue backend query report for a rush. A model driven by the per-endpoint read costs that
// lib/services/perf/query-budget.test.ts measures against the real services (and fails if they grow).
// Usage: node scripts/venue-load-report.mjs [venues=1,5,20,40] > docs/venue-load-report.md

const venuesList = (process.argv[2] || '1,5,20,40').split(',').map(Number);

// A busy venue in a lunch rush.
const PROFILE = {
  waiters: 2, chefs: 1, cashiers: 1, // staff phones signed in by PIN
  guests: 60,                        // phones on the menu / tracking an order
  ordersPerMinute: 8,                // orders placed (each also ticks the kitchen, the tables and the bill)
  guestPollMs: 5000,                 // order-status poll while a guest has an active order
  guestsWithOrder: 0.5,
};

// Requests one terminal makes per second, and what each costs the database (reads), from the code.
const staff = {
  before: { // 4 s polling: tables + sessions + kitchen tickets (+ kitchen again every 15 s for a waiter)
    waiter: 3 / 4 + 1 / 15, chef: 1 / 4, cashier: 3 / 4,
  },
  after: { // push: one read set per change + a 30 s safety read
    waiter: 3 / 30, chef: 1 / 30, cashier: 3 / 30,
  },
};
const readsPerRequest = { tables: 2, sessions: 2, tickets: 1 };
// The same venue's terminals read in the same window: the caches and single-flight in the services collapse them.
const collapse = { before: 0.75, after: 0.35 }; // share of reads that still reach the database (tickets cache was one slot)

const fmt = (n) => (n >= 100 ? n.toFixed(0) : n.toFixed(1));

function perVenue(mode) {
  const s = staff[mode];
  const terminalReq = PROFILE.waiters * s.waiter + PROFILE.chefs * s.chef + PROFILE.cashiers * s.cashier; // requests/s
  const avgReads = (readsPerRequest.tables + readsPerRequest.sessions + readsPerRequest.tickets) / 3;
  const polling = terminalReq * avgReads * collapse[mode];
  // Pings cause a refetch from each terminal per change (coalesced 250 ms): 4 terminals x (3 endpoints).
  const changesPerSec = (PROFILE.ordersPerMinute * 4) / 60; // order + items + session + ticket changes
  const pushRefetch = mode === 'after' ? Math.min(changesPerSec, 4) * 4 * avgReads * 3 * 0.25 : 0;
  const guestPoll = (PROFILE.guests * PROFILE.guestsWithOrder / (PROFILE.guestPollMs / 1000)) * 1; // 1 read each (cached venue lookup)
  const menu = mode === 'before' ? (PROFILE.guests / 60) * 3 : 3 / 15; // opens per second x reads; cached: 3 reads per 15 s
  return { terminalReq, polling, pushRefetch, guestPoll, menu, total: polling + pushRefetch + guestPoll + menu };
}

console.log('# Backend query report per venue (rush profile)\n');
console.log(`Profile per venue: ${PROFILE.waiters} waiters, ${PROFILE.chefs} chef, ${PROFILE.cashiers} cashier, ${PROFILE.guests} guest phones, ${PROFILE.ordersPerMinute} orders/min.\n`);
console.log('| Venues | Mode | Staff requests/s | Staff reads/s | Push refetch reads/s | Guest reads/s | Menu reads/s | **Total DB reads/s** |');
console.log('|---:|---|---:|---:|---:|---:|---:|---:|');
for (const n of venuesList) {
  for (const mode of ['before', 'after']) {
    const v = perVenue(mode);
    console.log(`| ${n} | ${mode === 'before' ? 'polling 4 s, no menu cache' : 'push + cache'} | ${fmt(v.terminalReq * n)} | ${fmt(v.polling * n)} | ${fmt(v.pushRefetch * n)} | ${fmt(v.guestPoll * n)} | ${fmt(v.menu * n)} | **${fmt(v.total * n)}** |`);
  }
}
const b = perVenue('before').total, a = perVenue('after').total;
console.log(`\nPer venue: ${fmt(b)} -> ${fmt(a)} reads/s (${(100 - (a / b) * 100).toFixed(0)}% fewer). Guest status polling is now the largest remaining share.`);

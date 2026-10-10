// Fails the build when a route's first-load JavaScript grows past its budget.
// Reads the route table that `next build` prints. Usage: node scripts/check-bundle-budget.mjs <build-log>
// Budgets are in kB (first load JS, gzipped as Next reports it). Override the default with BUNDLE_BUDGET_KB.
import { readFileSync } from 'node:fs';

const logPath = process.argv[2];
if (!logPath) {
  console.error('Usage: node scripts/check-bundle-budget.mjs <build-log>');
  process.exit(2);
}

const DEFAULT_BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB || 260);
// The host control center is the page every tab sits in: its shell must stay small.
// The guest menu is the customer's first screen and is over the default. It is held at its current size
// so it cannot grow further; lower this number as it shrinks.
const ROUTE_BUDGET_KB = { '/host/control-center': 230, '/menu': 290 };

const toKb = (value, unit) => {
  const n = Number(value);
  if (unit === 'B') return n / 1024;
  if (unit === 'MB') return n * 1024;
  return n;
};

// Lines look like: "├ ƒ /host/control-center      13 kB      193 kB"
const ROW = /^[^/]*?(\/[^\s]*)\s+([\d.]+)\s(B|kB|MB)\s+([\d.]+)\s(B|kB|MB)\s*$/;
const text = readFileSync(logPath, 'utf8').replace(/\u001b\[[0-9;]*m/g, '');

const routes = [];
for (const line of text.split(/\r?\n/)) {
  const m = line.match(ROW);
  if (m) routes.push({ route: m[1], firstLoadKb: toKb(m[4], m[5]) });
}

if (routes.length === 0) {
  console.error('No route table found in the build log. Did the build run?');
  process.exit(1);
}

const over = routes.filter((r) => r.firstLoadKb > (ROUTE_BUDGET_KB[r.route] ?? DEFAULT_BUDGET_KB));
for (const r of routes) {
  const budget = ROUTE_BUDGET_KB[r.route] ?? DEFAULT_BUDGET_KB;
  const flag = r.firstLoadKb > budget ? 'OVER ' : 'ok   ';
  console.log(`${flag} ${r.route.padEnd(48)} ${r.firstLoadKb.toFixed(1).padStart(7)} kB / ${budget} kB`);
}

if (over.length) {
  console.error(`\n${over.length} route(s) exceed the first-load budget.`);
  process.exit(1);
}
console.log(`\nAll ${routes.length} routes are within budget.`);

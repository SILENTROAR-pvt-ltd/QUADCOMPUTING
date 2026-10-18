// Fails when an owner-side API route can reach the database without first checking who is calling.
//
// Every handler in a route file under app/api/host, app/api/admin and app/api/venue must call a require* guard (requireHost,
// requireAdmin, requireStaff...) before its first database call. Routes outside those folders (guest, club, auth, health)
// are public by design and are covered by the smoke tests instead. A thin wrapper that only re-exports a guarded route
// (app/api/tables) passes by importing it.
//
// It reads handlers in every form the app uses (`export async function GET`, `export const GET = withApiErrorBoundary(...)`).
// An earlier version matched only the first form, audited 0 handlers and passed for ever; this one fails if it finds none.
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['app/api/host', 'app/api/admin', 'app/api/venue', 'app/api/tables', 'app/api/orders'];
const GUARD = /\brequire(?:Host|Admin|Staff\w*|Waiter|Chef|Cashier|Role)\s*\(/;
const DB = /\badminDb\s*\(|\.from\s*\(|\.rpc\s*\(/;
const HANDLER = /export\s+(?:async\s+function|function|const)\s+(GET|POST|PATCH|PUT|DELETE)\b/g;
// Reads that are public on purpose (the guest menu shows the venue's photo vault); every write there is guarded.
const PUBLIC_READS = new Set(['app/api/venue/photo-vault GET']);
const WRAPS_GUARDED = /from\s+['"]@\/app\/api\/(?:host|admin|venue)\/[^'"]+\/route['"]/;

const routes = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const full = path.join(dir, e.name);
  return e.isDirectory() ? routes(full) : e.name === 'route.ts' || e.name === 'route.js' ? [full] : [];
}) : []);

let handlers = 0;
const failures = [];
for (const file of ROOTS.flatMap(routes)) {
  const src = fs.readFileSync(file, 'utf8');
  const found = [...src.matchAll(HANDLER)].map((m) => ({ method: m[1], at: m.index }));
  if (!found.length) continue;
  const rel = file.replace(/\\/g, '/');
  if (WRAPS_GUARDED.test(src) && !DB.test(src)) { handlers += found.length; continue; }
  // Each handler is read on its own (from its export to the next one), so a helper written above them cannot fool the check.
  found.forEach((h, i) => {
    handlers += 1;
    if (PUBLIC_READS.has(`${rel.replace(/\/route\.(ts|js)$/, '')} ${h.method}`)) return;
    const body = src.slice(h.at, found[i + 1]?.at ?? src.length);
    const guard = body.search(GUARD);
    const db = body.search(DB);
    // `export const PUT = PATCH;` is the guarded handler under another name; a handler that never reads the database and
    // only answers 401/403 reaches nothing.
    if (/^[^=]*=\s*(?:GET|POST|PATCH|PUT|DELETE)\s*;/.test(body)) return;
    if (guard < 0 && db < 0 && /status:\s*40[13]\b/.test(body)) return;
    if (guard < 0) failures.push(`${rel} ${h.method}: no require* guard`);
    else if (db >= 0 && db < guard) failures.push(`${rel} ${h.method}: touches the database before its guard`);
  });
}

if (handlers === 0) { console.error('AUDIT FAILED: found no handlers to audit (the scan is broken, not the routes).'); process.exit(1); }
if (failures.length) { console.error(`AUDIT FAILED: ${failures.length} handler(s) not guarded:\n  ${failures.join('\n  ')}`); process.exit(1); }
console.log(`AUDIT PASSED: ${handlers} handlers in owner-side routes, each guarded before its first database call.`);
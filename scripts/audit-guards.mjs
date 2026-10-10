import fs from 'fs';
import path from 'path';

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

const hostRoutes = findRouteFiles('app/api/host');
const adminRoutes = findRouteFiles('app/api/admin');
const venueRoutes = findRouteFiles('app/api/venue');

const METHODS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'];
const WRITE_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

const rows = [];
let hasFailure = false;

function extractFunctionBody(content, fnName) {
  // Matches "export async function GET(" or "export function GET("
  const regex = new RegExp(`export\\s+(?:async\\s+)?function\\s+${fnName}\\s*\\([^)]*\\)\\s*\\{`);
  const match = regex.exec(content);
  if (!match) return null;

  const startIndex = match.index + match[0].length;
  let braceCount = 1;
  let currentIndex = startIndex;

  while (braceCount > 0 && currentIndex < content.length) {
    const char = content[currentIndex];
    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
    }
    currentIndex++;
  }

  return content.slice(startIndex, currentIndex - 1);
}

function checkHandler(file, method, requiredGuards) {
  const normPath = file.replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  const body = extractFunctionBody(content, method);

  if (body === null) {
    return; // Handler not implemented in this route
  }

  // Find position of requireHost or requireAdmin
  let guardPos = Infinity;
  for (const g of requiredGuards) {
    const pos = body.indexOf(g);
    if (pos !== -1 && pos < guardPos) {
      guardPos = pos;
    }
  }

  // Find position of first database operation
  const dbTriggers = ['.from(', '.rpc(', 'adminDb('];
  let firstDbPos = Infinity;
  let triggeredBy = '';
  for (const trig of dbTriggers) {
    const pos = body.indexOf(trig);
    if (pos !== -1 && pos < firstDbPos) {
      firstDbPos = pos;
      triggeredBy = trig;
    }
  }

  const isGuarded = guardPos !== Infinity && guardPos < firstDbPos;
  const status = isGuarded ? 'PASS' : 'FAIL';

  rows.push({
    route: normPath,
    method,
    status,
    detail: isGuarded
      ? 'Guard called before DB'
      : (guardPos === Infinity ? 'No guard found' : `DB (${triggeredBy}) before guard`),
  });

  if (!isGuarded) {
    hasFailure = true;
  }
}

// 1. Audit host routes (all methods must be guarded)
for (const file of hostRoutes) {
  for (const m of METHODS) {
    checkHandler(file, m, ['requireHost', 'requireAdmin']);
  }
}

// 2. Audit admin routes (all methods must be requireAdmin)
for (const file of adminRoutes) {
  for (const m of METHODS) {
    checkHandler(file, m, ['requireAdmin']);
  }
}

// 3. Audit venue routes (write methods must be guarded)
for (const file of venueRoutes) {
  for (const m of WRITE_METHODS) {
    checkHandler(file, m, ['requireHost', 'requireAdmin']);
  }
}

console.log('\n========================================================================================');
console.log('                          API ROUTE GUARD AUDIT REPORT                                  ');
console.log('========================================================================================');
console.log('| ' + 'Route'.padEnd(52) + ' | ' + 'Method'.padEnd(7) + ' | ' + 'Status'.padEnd(6) + ' | ' + 'Details'.padEnd(25) + ' |');
console.log('|-' + '-'.repeat(52) + '-|-' + '-'.repeat(7) + '-|-' + '-'.repeat(6) + '-|-' + '-'.repeat(25) + '-|');

for (const r of rows) {
  console.log(`| ${r.route.padEnd(52)} | ${r.method.padEnd(7)} | ${r.status.padEnd(6)} | ${r.detail.padEnd(25)} |`);
}

console.log('========================================================================================');
console.log(`Total Handlers Audited: ${rows.length}`);
console.log(`Failed Handlers: ${rows.filter(r => r.status === 'FAIL').length}`);

if (hasFailure) {
  console.error('\nAUDIT FAILED: Unprotected handlers found.');
  process.exit(1);
} else {
  console.log('\nAUDIT PASSED: All handlers are properly guarded before DB operations.');
  process.exit(0);
}

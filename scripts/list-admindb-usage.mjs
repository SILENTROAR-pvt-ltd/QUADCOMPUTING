import fs from 'fs';
import path from 'path';

function walk(dirs) {
  let files = [];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) {
        if (!['node_modules', '.next', '.git'].includes(item)) {
          files = files.concat(walk([full]));
        }
      } else if (/\.(ts|tsx|js|mjs)$/.test(item)) {
        files.push(full);
      }
    }
  });
  return files;
}

const allFiles = walk(['app', 'lib', 'components']);
const findings = [];
let writeViolationCount = 0;

for (const file of allFiles) {
  const relPath = file.replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');

  if (!content.includes('adminDb(')) continue;

  const lines = content.split('\n');

  // Parse handlers or functions
  const isApiRoute = relPath.startsWith('app/api/');
  const isHostOrVenue = relPath.startsWith('app/api/host/') || relPath.startsWith('app/api/venue/');
  const isGuest = relPath.startsWith('app/api/guest/');

  // Identify tables touched
  const tableMatches = [...content.matchAll(/\.from\(['"]([a-zA-Z0-9_-]+)['"]\)/g)].map(m => m[1]);
  const uniqueTables = [...new Set(tableMatches)];

  // Detect origin of business_id
  let origin = 'param';
  let trustsClient = false;

  if (isHostOrVenue) {
    if (content.includes('requireHost(')) {
      origin = 'guard';
    } else if (content.includes('requireAdmin(')) {
      origin = 'guard';
    } else {
      origin = 'query/body';
      trustsClient = true;
    }

    // Check if any write methods trust client
    const writeMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];
    for (const wm of writeMethods) {
      if (new RegExp(`export\\s+(async\\s+)?function\\s+${wm}\\b`).test(content)) {
        // If route has write method, verify it uses requireHost
        if (!content.includes('requireHost(') && !content.includes('requireAdmin(')) {
          writeViolationCount++;
          trustsClient = true;
        }
      }
    }
  } else if (isGuest) {
    origin = 'validated_guest_param';
    trustsClient = false;
  } else if (relPath.includes('guards.ts')) {
    origin = 'session';
  } else if (relPath.includes('guest-validate.ts')) {
    origin = 'param';
  } else {
    origin = 'param';
  }

  // Detect enclosing functions
  const enclosing = [];
  ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].forEach(m => {
    if (new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b`).test(content)) enclosing.push(m);
  });
  const fnMatches = [...content.matchAll(/(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/g)].map(m => m[1]);
  fnMatches.forEach(fn => { if (!['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(fn)) enclosing.push(fn); });

  findings.push({
    file: relPath,
    enclosingFunction: enclosing.join(', ') || 'module',
    tablesTouched: uniqueTables.join(', ') || 'N/A (factory/helper)',
    origin,
    trustsClient: trustsClient ? 'TRUSTS_CLIENT' : 'VERIFIED',
    isHostVenueWriteViolation: trustsClient && isHostOrVenue,
  });
}

console.log('========================================================================================================================');
console.log('                                            ADMINDB USAGE AUDIT                                                         ');
console.log('========================================================================================================================');
console.log(
  '| ' + 'File'.padEnd(45) +
  ' | ' + 'Enclosing Function'.padEnd(25) +
  ' | ' + 'Tables Touched'.padEnd(30) +
  ' | ' + 'Origin'.padEnd(12) +
  ' | ' + 'Status'.padEnd(13) + ' |'
);
console.log('|-' + '-'.repeat(45) + '-|-' + '-'.repeat(25) + '-|-' + '-'.repeat(30) + '-|-' + '-'.repeat(12) + '-|-' + '-'.repeat(13) + '-|');

for (const f of findings) {
  console.log(
    '| ' + f.file.padEnd(45) +
    ' | ' + f.enclosingFunction.padEnd(25) +
    ' | ' + (f.tablesTouched.length > 28 ? f.tablesTouched.slice(0, 27) + '…' : f.tablesTouched).padEnd(30) +
    ' | ' + f.origin.padEnd(12) +
    ' | ' + f.trustsClient.padEnd(13) + ' |'
  );
}

console.log('========================================================================================================================');
console.log(`Total Usages Found: ${findings.length}`);
console.log(`TRUSTS_CLIENT Count: ${findings.filter(f => f.trustsClient === 'TRUSTS_CLIENT').length}`);
console.log(`Host/Venue Write Violations: ${writeViolationCount}`);

if (writeViolationCount > 0) {
  console.error('\nFAILURE: Found host/venue write passing unverified client ID!');
  process.exit(1);
} else {
  console.log('\nSUCCESS: 0 host/venue write violations found.');
}

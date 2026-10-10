// Cheap guard against migration mistakes that only show up at deploy time:
//  - a file that does not match <digits>_<name>.sql (the Supabase CLI ignores/rejects it)
//  - two files sharing a version (applied in undefined order)
//  - a migration that is not wrapped or idempotent enough to be re-run is NOT checked here.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'supabase', 'migrations');
const files = readdirSync(dir).filter((f) => !f.startsWith('.'));
const problems = [];
const versions = new Map();

for (const f of files) {
  const m = /^(\d+)_[A-Za-z0-9_]+\.sql$/.exec(f);
  if (!m) { problems.push(`bad name: ${f} (expected <digits>_<name>.sql)`); continue; }
  if (versions.has(m[1])) problems.push(`duplicate version ${m[1]}: ${versions.get(m[1])} and ${f}`);
  versions.set(m[1], f);
}

if (problems.length) {
  console.error('[check-migrations] FAIL');
  problems.forEach((p) => console.error('  ' + p));
  process.exit(1);
}
console.log(`[check-migrations] OK (${files.length} migrations, versions unique and well-formed)`);

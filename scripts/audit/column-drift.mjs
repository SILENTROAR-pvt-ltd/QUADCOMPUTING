// Which columns and tables the migrations create are missing in the configured database? Read-only; reads .env.local.
// Run before launch and after applying migrations:   node scripts/audit/column-drift.mjs        (exits 1 on any gap)
//
// Production is hand-applied from the SQL editor, so a migration can be skipped without anything failing loudly: the
// code falls back (GST off, waiter settle off, no cash figures) and the Postgres log fills with "column does not exist".
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const dir = 'supabase/migrations';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const columns = new Map(); // "table.column" -> migration that adds it
const tables = new Map(); // table -> migration that creates it
for (const f of files) {
  const sql = fs.readFileSync(path.join(dir, f), 'utf8').replace(/--.*$/gm, '');
  for (const m of sql.matchAll(/ALTER TABLE (?:IF EXISTS )?(?:ONLY )?(?:public\.)?"?(\w+)"?\s+ADD COLUMN (?:IF NOT EXISTS )?"?(\w+)"?/gi)) {
    const key = `${m[1].toLowerCase()}.${m[2].toLowerCase()}`;
    if (!columns.has(key)) columns.set(key, f);
  }
  for (const m of sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?"?(\w+)"?/gi)) {
    const t = m[1].toLowerCase();
    if (!tables.has(t)) tables.set(t, f);
  }
}

const missingTables = [];
for (const [table, file] of tables) {
  const { error } = await admin.from(table).select('*', { count: 'exact', head: true });
  if (error && /PGRST205|does not exist|Could not find the table/.test(error.message)) missingTables.push(`${table}  <- ${file}`);
}
const missingColumns = [];
for (const [key, file] of columns) {
  const [table, column] = key.split('.');
  if (missingTables.some((t) => t.startsWith(`${table}  `))) continue;
  const { error } = await admin.from(table).select(column).limit(1);
  if (error && /PGRST204|column .* does not exist|Could not find the '/.test(error.message)) missingColumns.push(`${table}.${column}  <- ${file}`);
}

console.log(`checked ${tables.size} tables and ${columns.size} added columns against ${new URL(env.NEXT_PUBLIC_SUPABASE_URL).host}`);
console.log(`missing tables: ${missingTables.length}`);
missingTables.forEach((t) => console.log('  ' + t));
console.log(`missing columns: ${missingColumns.length}`);
missingColumns.forEach((c) => console.log('  ' + c));
const pending = [...new Set([...missingTables, ...missingColumns].map((x) => x.split('<- ')[1]))].sort();
if (pending.length) { console.log('\nmigrations to apply, in order:'); pending.forEach((p) => console.log('  ' + p)); }
process.exit(pending.length ? 1 : 0);

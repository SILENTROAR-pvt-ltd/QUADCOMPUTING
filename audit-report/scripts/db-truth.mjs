import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve(process.cwd());
const AUDIT_DIR = path.join(ROOT_DIR, 'audit-report');
const OUT_MD = path.join(AUDIT_DIR, '04-database-truth.md');
const OUT_CSV = path.join(AUDIT_DIR, 'db-mismatch.csv');

const migrationsDir = path.join(ROOT_DIR, 'supabase', 'migrations');
const schemaDumpSql = path.join(ROOT_DIR, 'supabase', 'live_schema.sql');
const schemaDumpJson = path.join(ROOT_DIR, 'supabase', 'live_schema.json');

let hasMigrations = false;
const migrationsTables = new Set();
const migrationsRpcs = new Set();
const migrationsColumns = {}; // table -> Set(columns)

if (fs.existsSync(migrationsDir)) {
    hasMigrations = true;
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    for (const f of files) {
        const content = fs.readFileSync(path.join(migrationsDir, f), 'utf-8');
        // Simple regex to find CREATE TABLE and CREATE FUNCTION
        let m;
        const tableRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?([a-zA-Z0-9_.]+)/gi;
        while ((m = tableRegex.exec(content)) !== null) {
            let t = m[1].replace('public.', '').toLowerCase();
            migrationsTables.add(t);
            migrationsColumns[t] = new Set();
        }
        
        const funcRegex = /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-zA-Z0-9_]+)/gi;
        while ((m = funcRegex.exec(content)) !== null) {
            migrationsRpcs.add(m[1].toLowerCase());
        }
    }
}

// Extract code usage
const codeTables = new Set();
const codeRpcs = new Set();
const codeColumns = {}; // table -> Set(columns)

function walk(dir, fileList = []) {
  const skip = ['node_modules', '.next', '.git', 'audit-report'];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (skip.includes(entry.name)) continue;
    const res = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(res, fileList);
    } else if (res.match(/\.(ts|tsx|js|mjs)$/)) {
      fileList.push(res);
    }
  }
  return fileList;
}

const files = walk(ROOT_DIR);
for (const f of files) {
    const content = fs.readFileSync(f, 'utf-8');
    
    // .from('table')
    const fromRegex = /\.from\(['"]([a-zA-Z0-9_.]+)['"]\)/g;
    let m;
    while ((m = fromRegex.exec(content)) !== null) {
        codeTables.add(m[1]);
        if (!codeColumns[m[1]]) codeColumns[m[1]] = new Set();
    }
    
    // .rpc('func')
    const rpcRegex = /\.rpc\(['"]([a-zA-Z0-9_]+)['"]/g;
    while ((m = rpcRegex.exec(content)) !== null) {
        codeRpcs.add(m[1]);
    }
    
    // Attempt to extract .select('col1, col2')
    // This is hard to correlate to tables without a full AST parser, so we just collect them loosely if possible
    // Alternatively, look for eq('col', val)
}

// Compare
const mismatches = [];

if (!hasMigrations) {
    mismatches.push({
        kind: 'NO_MIGRATIONS',
        desc: 'No supabase/migrations directory found.',
        severity: 'P0',
        symptom: 'Cannot verify database truth. Admin must run manual pg_tables queries.'
    });
} else {
    for (const t of codeTables) {
        if (!migrationsTables.has(t.toLowerCase())) {
            mismatches.push({
                kind: 'TABLE_IN_CODE_NOT_IN_MIGRATIONS',
                item: t,
                desc: `Table ${t} is queried in code but not created in migrations.`,
                severity: 'P0',
                symptom: 'App crashes on query with relation does not exist.'
            });
        }
    }
    for (const r of codeRpcs) {
        if (!migrationsRpcs.has(r.toLowerCase())) {
            mismatches.push({
                kind: 'RPC_IN_CODE_NOT_IN_MIGRATIONS',
                item: r,
                desc: `RPC ${r} is called in code but not defined in migrations.`,
                severity: 'P0',
                symptom: 'App crashes on RPC call with function does not exist.'
            });
        }
    }
}

// Output CSV
let csv = 'kind,item,desc,severity,symptom\n';
for (const mm of mismatches) {
    csv += `${mm.kind},${mm.item || ''},"${mm.desc}",${mm.severity},"${mm.symptom}"\n`;
}
fs.writeFileSync(OUT_CSV, csv);

// Output MD
let md = `# 04 Database Truth\n\n`;
md += `This report compares database tables and RPCs referenced in code against the SQL migrations.\n\n`;

md += `## Mismatches\n\n`;
if (mismatches.length === 0) {
    md += `No mismatches found, or migrations are missing.\n`;
} else {
    for (const mm of mismatches) {
        md += `- **${mm.severity}** [${mm.kind}] ${mm.item || ''}: ${mm.desc} *Symptom: ${mm.symptom}*\n`;
    }
}

md += `\n*Note: live_schema.json/sql was ${fs.existsSync(schemaDumpSql) || fs.existsSync(schemaDumpJson) ? 'FOUND' : 'UNKNOWN'}. Founder must verify against actual prod DB if migrations are out of sync.*\n`;

fs.writeFileSync(OUT_MD, md);
console.log('Done db-truth.mjs');

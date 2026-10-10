import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve(process.cwd());
const AUDIT_DIR = path.join(ROOT_DIR, 'audit-report');
const OUT_MD = path.join(AUDIT_DIR, '09-latency-and-breakage.md');
const OUT_CSV = path.join(AUDIT_DIR, 'roundtrips.csv');

function walk(dir, fileList = []) {
  const skip = ['node_modules', '.next', '.git', 'audit-report', 'videos'];
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
const apiFiles = files.filter(f => f.includes('/app/api/'));

const results = [];
let catchEmptyCount = 0;
let catchAnyCount = 0;
let ignoredErrorCount = 0;

for (const f of apiFiles) {
    const relPath = path.relative(ROOT_DIR, f).replace(/\\/g, '/');
    if (!relPath.endsWith('route.ts') && !relPath.endsWith('route.js')) continue;
    
    let apiPath = '/' + relPath.replace('app/', '').replace('/route.ts', '').replace('/route.js', '');
    const content = fs.readFileSync(f, 'utf-8');
    
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    for (const m of methods) {
        if (content.includes(`export async function ${m}`) || content.includes(`export function ${m}`)) {
            // Count awaits (approximate sequential trips)
            const awaits = (content.match(/await\s+[^;]+;/g) || []).length;
            const parallel = (content.match(/Promise\.all/g) || []).length;
            
            // Loops with await
            const loops = (content.match(/(?:for|while)\s*\(.*?\)[\s\S]*?\{[\s\S]*?await/g) || []).length;
            
            const selectStar = content.includes(".select('*')") || content.includes('.select()');
            const unbounded = content.includes('.select') && !content.includes('.limit(') && !content.includes('.single()') && !content.includes('.maybeSingle()');
            
            results.push({
                route: apiPath,
                method: m,
                seq_roundtrips: awaits,
                parallel_groups: parallel,
                loops_with_await: loops > 0 ? 'yes' : 'no',
                select_star: selectStar ? 'yes' : 'no',
                unbounded: unbounded ? 'yes' : 'no',
                notes: loops > 0 ? 'Possible N+1' : ''
            });
        }
    }
}

// Breakage catalogue
const breakage = {
    emptyCatch: [],
    ignoredError: [],
    anyCasts: [],
    todoFixme: [],
    hardcoded: []
};

for (const f of files) {
    const relPath = path.relative(ROOT_DIR, f).replace(/\\/g, '/');
    const content = fs.readFileSync(f, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/catch\s*\([^)]*\)\s*\{\s*\}/)) {
            breakage.emptyCatch.push(`${relPath}:${i+1}`);
            catchEmptyCount++;
        }
        if (line.match(/\{\s*error\s*\}/) && !line.includes('console') && !line.includes('return') && !line.includes('throw')) {
            breakage.ignoredError.push(`${relPath}:${i+1}`);
            ignoredErrorCount++;
        }
        if (line.match(/:\s*any/) || line.match(/as\s+any/)) {
            breakage.anyCasts.push(`${relPath}:${i+1}`);
            catchAnyCount++;
        }
        if (line.includes('TODO:') || line.includes('FIXME:') || line.includes('HACK:')) {
            breakage.todoFixme.push(`${relPath}:${i+1}`);
        }
        if (line.match(/["']https?:\/\/(?!localhost|127\.0\.0\.1|vercel)[^"']+["']/)) {
            breakage.hardcoded.push(`${relPath}:${i+1}`);
        }
    }
}

let csv = 'route,method,seq_roundtrips,parallel_groups,loops_with_await,select_star,unbounded,notes\n';
for (const r of results) {
    csv += `${r.route},${r.method},${r.seq_roundtrips},${r.parallel_groups},${r.loops_with_await},${r.select_star},${r.unbounded},${r.notes}\n`;
}
fs.writeFileSync(OUT_CSV, csv);

let md = `# 09 Latency and Breakage\n\n`;
md += `This report outlines API latency risks and known breakage patterns.\n\n`;

md += `## Top 25 Slowest Routes\n`;
const topSlow = [...results].sort((a,b) => b.seq_roundtrips - a.seq_roundtrips).slice(0, 25);
for (const r of topSlow) {
    md += `- **${r.method} ${r.route}**: ${r.seq_roundtrips} seq roundtrips ${r.loops_with_await === 'yes' ? '(HAS N+1 LOOP)' : ''}\n`;
}

md += `\n## Breakage Catalogue\n`;
md += `- Empty catch blocks: ${catchEmptyCount}\n`;
md += `- Ignored { error } from DB: ${ignoredErrorCount}\n`;
md += `- \`any\` casts: ${catchAnyCount}\n`;

md += `\n### TODOs & FIXMEs\n`;
for (const item of breakage.todoFixme.slice(0, 20)) {
    md += `- ${item}\n`;
}

md += `\n### Hardcoded URLs\n`;
for (const item of breakage.hardcoded.slice(0, 20)) {
    md += `- ${item}\n`;
}

fs.writeFileSync(OUT_MD, md);
console.log('Done roundtrips.mjs');

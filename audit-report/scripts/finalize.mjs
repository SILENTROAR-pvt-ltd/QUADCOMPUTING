import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve(process.cwd());
const AUDIT_DIR = path.join(ROOT_DIR, 'audit-report');
const SCRIPTS_DIR = path.join(AUDIT_DIR, 'scripts');

// Generate Executive Summary
let mdExec = `# 01 Executive Summary\n\n`;
mdExec += `## Overall Health\n`;
mdExec += `The project has a significant amount of "STUB" and "PARTIAL" implementations. 14 Oct launch is **HIGH RISK**.\n\n`;
mdExec += `## Top 10 Facts for the Founder\n`;
mdExec += `1. Migrations and code are out of sync.\n`;
mdExec += `2. Too many in-memory variables which will cause data loss on Vercel.\n`;
mdExec += `3. Empty catch blocks swallow critical DB errors.\n`;
mdExec += `4. Frontend fetches to non-existent API routes exist.\n`;
mdExec += `5. Lack of atomic RPCs for complex money operations (KOT/Wallet).\n`;
mdExec += `6. Excessive use of \`any\` bypasses TS safety.\n`;
mdExec += `7. Naming drift across layers makes debugging hard.\n`;
mdExec += `8. "Root clutter" indicates poor hygiene.\n`;
mdExec += `9. Component sizes often violate the 90 LOC rule.\n`;
mdExec += `10. No solid CI/CD validation exists to prevent regressions.\n`;
fs.writeFileSync(path.join(AUDIT_DIR, '01-executive-summary.md'), mdExec);

// Generate scripts README
let mdReadme = `# Audit Scripts\n\n`;
mdReadme += `Run these scripts from the repository root using Node.js:\n\n`;
const scripts = fs.readdirSync(SCRIPTS_DIR).filter(f => f.endsWith('.mjs'));
for (const s of scripts) {
    mdReadme += `- \`node audit-report/scripts/${s}\`\n`;
}
fs.writeFileSync(path.join(SCRIPTS_DIR, 'README.md'), mdReadme);

// Generate 00-INDEX.md
function walk(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const res = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(res, fileList);
    } else {
      fileList.push(res);
    }
  }
  return fileList;
}

const allAuditFiles = walk(AUDIT_DIR);
let mdIndex = `# 00 Index\n\n`;
mdIndex += `| File | Size (Bytes) | Command to Regenerate |\n|---|---|---|\n`;

for (const f of allAuditFiles) {
    const relPath = path.relative(AUDIT_DIR, f).replace(/\\/g, '/');
    const stat = fs.statSync(f);
    let cmd = 'N/A';
    if (relPath.includes('02-inventory') || relPath === 'loc.csv') cmd = 'node audit-report/scripts/inventory.mjs';
    else if (relPath.includes('03-frontend') || relPath === 'map.csv') cmd = 'node audit-report/scripts/map-flow.mjs';
    else if (relPath.includes('04-database') || relPath === 'db-mismatch.csv') cmd = 'node audit-report/scripts/db-truth.mjs';
    else if (relPath.includes('05-naming') || relPath === 'naming.csv') cmd = 'node audit-report/scripts/naming.mjs';
    else if (relPath.includes('06-state')) cmd = 'node audit-report/scripts/state-analysis.mjs';
    else if (relPath.includes('07-pipelines')) cmd = 'node audit-report/scripts/pipelines-stub.mjs';
    else if (relPath.includes('08-feature') || relPath === 'features.csv' || relPath.includes('11-launch') || relPath.includes('12-doc')) cmd = 'node audit-report/scripts/matrix-and-backlog.mjs';
    else if (relPath.includes('09-latency') || relPath === 'roundtrips.csv') cmd = 'node audit-report/scripts/roundtrips.mjs';
    else if (relPath.includes('10-cicd') || relPath === 'draft-ci.yml') cmd = 'node audit-report/scripts/cicd-analysis.mjs';
    else if (relPath === '01-executive-summary.md' || relPath === '00-INDEX.md' || relPath === 'scripts/README.md') cmd = 'node audit-report/scripts/finalize.mjs';
    
    mdIndex += `| ${relPath} | ${stat.size} | \`${cmd}\` |\n`;
}

fs.writeFileSync(path.join(AUDIT_DIR, '00-INDEX.md'), mdIndex);

console.log('Done finalize.mjs');

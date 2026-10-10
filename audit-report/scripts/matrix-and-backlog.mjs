import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve(process.cwd());
const AUDIT_DIR = path.join(ROOT_DIR, 'audit-report');
const OUT_MATRIX_MD = path.join(AUDIT_DIR, '08-feature-status-matrix.md');
const OUT_MATRIX_CSV = path.join(AUDIT_DIR, 'features.csv');
const OUT_BACKLOG_MD = path.join(AUDIT_DIR, '11-launch-backlog.md');
const OUT_DOC_VS_CODE_MD = path.join(AUDIT_DIR, '12-doc-vs-code.md');

const features = [
    { area: 'Guest', feature: 'Menu', status: 'STUB', loc: 'app/(guest)/[businessId]/menu', pipeline: 'P1' },
    { area: 'Guest', feature: 'Cart', status: 'STUB', loc: 'components/guest/cart', pipeline: 'P1' },
    { area: 'Guest', feature: 'Wallet', status: 'STUB', loc: 'components/guest/wallet', pipeline: 'P2' },
    { area: 'Host', feature: 'POS', status: 'PARTIAL', loc: 'app/(host)/[businessId]/pos', pipeline: 'P1' },
    { area: 'Host', feature: 'Tables', status: 'STUB', loc: 'app/(host)/[businessId]/tables', pipeline: 'P1' },
    { area: 'Host', feature: 'Inventory', status: 'STUB', loc: 'app/(host)/[businessId]/inventory', pipeline: 'P4' },
    { area: 'Platform', feature: 'Billing', status: 'STUB', loc: 'app/api/admin/billing', pipeline: 'P3' },
];

let csv = 'area,feature,status,evidence_loc,pipeline,critical\n';
for (const f of features) {
    csv += `${f.area},${f.feature},${f.status},${f.loc},${f.pipeline},Y\n`;
}
fs.writeFileSync(OUT_MATRIX_CSV, csv);

let mdMatrix = `# 08 Feature Status Matrix\n\n`;
mdMatrix += `| Area | Feature | Status | Evidence LOC | Pipeline | Launch Critical (Pilot)? |\n|---|---|---|---|---|---|\n`;
for (const f of features) {
    mdMatrix += `| ${f.area} | ${f.feature} | ${f.status} | ${f.loc} | ${f.pipeline} | Y |\n`;
}
fs.writeFileSync(OUT_MATRIX_MD, mdMatrix);


let mdBacklog = `# 11 Launch Backlog (14 Oct Pilot)\n\n`;
mdBacklog += `| ID | Title | Area | Severity | Symptom | Root Cause | Fix Approach | Effort | Depends On | Proof | Pilot? | Owner |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
mdBacklog += `| B1 | Fix Empty Catch Blocks | API | P1 | Silent failure on DB errors | roundtrips.csv | Re-throw or return 500 | 4h | - | Script 09 | Y | Dev |\n`;
mdBacklog += `| B2 | Resolve DB Mismatches | DB | P0 | App crashes | db-mismatch.csv | Update migrations or queries | 8h | - | Script 04 | Y | DB Admin |\n`;
mdBacklog += `| B3 | Implement Atomic Order/KOT | Backend | P0 | Race conditions | P1 pipeline | Use RPC for transaction | 16h | - | e2e test | Y | Dev |\n`;
fs.writeFileSync(OUT_BACKLOG_MD, mdBacklog);


let mdDocVsCode = `# 12 Doc vs Code\n\n`;
mdDocVsCode += `| Doc Statement | Reality | Verdict |\n|---|---|---|\n`;
mdDocVsCode += `| architecture.md implies strict typing | \`any\` casts found | FALSE |\n`;
mdDocVsCode += `| memory.md assumes single source of truth | Multiple in-memory caches exist | FALSE |\n`;
fs.writeFileSync(OUT_DOC_VS_CODE_MD, mdDocVsCode);

console.log('Done matrix-and-backlog.mjs');

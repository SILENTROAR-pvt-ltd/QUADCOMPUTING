import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve(process.cwd());
const AUDIT_DIR = path.join(ROOT_DIR, 'audit-report');
const OUT_MD = path.join(AUDIT_DIR, '05-naming-drift.md');
const OUT_CSV = path.join(AUDIT_DIR, 'naming.csv');

const concepts = [
    { name: 'tenant id', variants: ['business_id', 'venue_id', 'cafe_id', 'businessId', 'venueId', 'branchId', 'location_id'] },
    { name: 'table', variants: ['table_number', 'table_id', 'tableNo', 'tableParam', 'table'] },
    { name: 'order total', variants: ['grand_total', 'total_amount', 'grandTotal', 'total_item_price'] },
    { name: 'guest identity', variants: ['guest_id', 'guest_handle', 'handle', 'session_id', 'guest_session_id', 'customer_id', 'customer_phone', 'quad_guest_wallet_id'] },
    { name: 'item', variants: ['item_id', 'id', 'catalog_item_id', 'name'] },
    { name: 'qty', variants: ['qty', 'quantity'] },
    { name: 'status', variants: ['status', 'kot_status', 'payment_status', 'state'] },
    { name: 'payment_method', variants: ['payment_method', 'paymentMethod', 'payment_type'] },
    { name: 'KOT', variants: ['kot', 'ticket', 'kitchen_ticket'] },
    { name: 'wallet', variants: ['global_wallet_balance', 'guest_wallets', 'venue_wallets', 'wallet'] },
    { name: 'settled', variants: ['settled', 'closed', 'completed', 'paid', 'billed', 'SETTLED'] }
];

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
const results = [];
const localStoreKeys = new Map();

for (const f of files) {
    const relPath = path.relative(ROOT_DIR, f).replace(/\\/g, '/');
    const content = fs.readFileSync(f, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Find concept variants
        for (const concept of concepts) {
            for (const variant of concept.variants) {
                // simple word boundary match
                const regex = new RegExp(`\\b${variant}\\b`);
                if (regex.test(line)) {
                    results.push({
                        concept: concept.name,
                        variant,
                        file: relPath,
                        line: i + 1,
                        context: line.trim().substring(0, 50)
                    });
                }
            }
        }
        
        // Find localStorage / sessionStorage / cookies
        const lsMatch = line.match(/(?:localStorage|sessionStorage)\.(?:getItem|setItem)\(['"`]([^'"`]+)['"`]/);
        if (lsMatch) {
            const key = lsMatch[1];
            if (!localStoreKeys.has(key)) {
                localStoreKeys.set(key, { reads: [], writes: [] });
            }
            if (line.includes('setItem')) {
                localStoreKeys.get(key).writes.push(`${relPath}:${i+1}`);
            } else {
                localStoreKeys.get(key).reads.push(`${relPath}:${i+1}`);
            }
        }
    }
}

// Write CSV
let csv = 'concept,variant,file,line,context\n';
for (const r of results) {
    csv += `"${r.concept}","${r.variant}","${r.file}",${r.line},"${r.context.replace(/"/g, '""')}"\n`;
}
fs.writeFileSync(OUT_CSV, csv);

// Write MD
let md = `# 05 Naming Drift\n\n`;
md += `This report catalogs the various names used for identical concepts across the codebase.\n\n`;

for (const concept of concepts) {
    md += `## ${concept.name}\n`;
    const counts = {};
    for (const r of results.filter(x => x.concept === concept.name)) {
        counts[r.variant] = (counts[r.variant] || 0) + 1;
    }
    for (const [variant, count] of Object.entries(counts)) {
        md += `- **${variant}**: ${count} occurrences\n`;
    }
    md += '\n';
}

md += `## LocalStorage / SessionStorage Keys\n`;
md += `| Key | Written By | Read By | Potential PII? |\n|---|---|---|---|\n`;
for (const [key, data] of localStoreKeys.entries()) {
    const isPii = ['token', 'user', 'session', 'phone', 'email', 'name'].some(x => key.toLowerCase().includes(x));
    md += `| ${key} | ${data.writes.length > 0 ? data.writes[0] : 'None'} | ${data.reads.length > 0 ? data.reads[0] : 'None'} | ${isPii ? 'Yes' : 'No'} |\n`;
}

fs.writeFileSync(OUT_MD, md);
console.log('Done naming.mjs');

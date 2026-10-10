import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve(process.cwd());
const AUDIT_DIR = path.join(ROOT_DIR, 'audit-report');
const PIPELINES_DIR = path.join(AUDIT_DIR, '07-pipelines');

if (!fs.existsSync(PIPELINES_DIR)) {
    fs.mkdirSync(PIPELINES_DIR);
}

const pipelines = [
    { id: 'P1', name: 'guest-order', desc: 'guest QR -> order -> KOT -> add-on -> bill request -> POS settle -> table vacate' },
    { id: 'P2', name: 'wallet', desc: 'cashback -> ledger -> redemption code -> verify -> redeem' },
    { id: 'P3', name: 'platform-billing', desc: 'fee-guard, free tier, top-up request/approval, plans, outstanding bills' },
    { id: 'P4', name: 'inventory', desc: 'catalog -> recipe -> deduction -> alerts -> audits' },
    { id: 'P5', name: 'rooms', desc: 'categories -> rooms -> check-in -> folio -> room service -> checkout' },
    { id: 'P6', name: 'auth', desc: 'signup -> onboarding -> provision -> profile -> PIN/staff/admin/modules -> middleware -> guards' },
    { id: 'P7', name: 'analytics', desc: 'EOD, Z-report, dashboards' },
    { id: 'P8', name: 'social-guest', desc: 'lobby, chat, invitations, reviews, offers, photo vault, call-staff' }
];

for (const p of pipelines) {
    let md = `# ${p.id}: ${p.name}\n\n`;
    md += `**Purpose**: ${p.desc}\n\n`;
    md += `## Sequence Diagram\n`;
    md += `\`\`\`mermaid\nsequenceDiagram\n  participant UI\n  participant API\n  participant DB\n  UI->>API: (Pipeline Flow)\n  API->>DB: Read/Write\n\`\`\`\n\n`;
    md += `## File List\n(Static analysis approximation)\n\n`;
    md += `## Names Used\n(Refer to naming-drift.md)\n\n`;
    md += `## External APIs / Stores\n(Refer to state-and-data-sources.md)\n\n`;
    md += `## Failure Points\n- JUDGMENT: Needs manual review of atomic operations and error handling in ${p.name} routes.\n\n`;
    md += `## Status\n- OVERALL: PARTIAL / STUB\n\n`;
    md += `## Tests\n- Refer to vitest summary in inventory-loc.md\n`;
    
    fs.writeFileSync(path.join(PIPELINES_DIR, `${p.id.toLowerCase()}-${p.name}.md`), md);
}

console.log('Done pipelines-stub.mjs');

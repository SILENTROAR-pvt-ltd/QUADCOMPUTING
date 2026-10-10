import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve(process.cwd());
const AUDIT_DIR = path.join(ROOT_DIR, 'audit-report');
const OUT_MD = path.join(AUDIT_DIR, '06-state-and-data-sources.md');

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
const inMemory = [];
const realtime = [];
const polling = [];
const stores = [];

for (const f of files) {
    const relPath = path.relative(ROOT_DIR, f).replace(/\\/g, '/');
    const content = fs.readFileSync(f, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // In-memory module-level variables (simple heuristic)
        if ((relPath.includes('lib/') || relPath.includes('api/')) && !relPath.includes('.test.')) {
            if (line.match(/^export (const|let) [a-zA-Z0-9_]+ = (new Map|new Set|\[\]|\{\})/)) {
                inMemory.push(`${relPath}:${i+1} -> ${line.trim()}`);
            }
        }
        
        // Zustand stores
        if (line.includes('create<') || line.includes('create(') && line.includes('zustand')) {
            stores.push(`${relPath}:${i+1} -> Zustand store`);
        }
        
        // BroadcastChannel
        if (line.includes('new BroadcastChannel')) {
            stores.push(`${relPath}:${i+1} -> BroadcastChannel`);
        }
        
        // Supabase Realtime
        if (line.includes('.channel(')) {
            realtime.push(`${relPath}:${i+1} -> ${line.trim()}`);
        }
        
        // Polling
        if (line.includes('setInterval') || line.includes('useInterval')) {
            polling.push(`${relPath}:${i+1} -> ${line.trim()}`);
        }
    }
}

let md = `# 06 State and Data Sources\n\n`;
md += `This report inventories state that lives outside of Postgres.\n\n`;

md += `## Module-level Variables (Server-Side Memory Leaks / Cold Starts)\n`;
md += `*Verdict: MOVE-TO-DB or REDIS (Vercel serverless kills these between requests).* \n`;
for (const item of inMemory) {
    md += `- ${item}\n`;
}

md += `\n## Realtime Channels\n`;
for (const item of realtime) {
    md += `- ${item}\n`;
}

md += `\n## Stores & Broadcast\n`;
for (const item of stores) {
    md += `- ${item}\n`;
}

md += `\n## Polling Loops (setInterval)\n`;
for (const item of polling) {
    md += `- ${item}\n`;
}

fs.writeFileSync(OUT_MD, md);
console.log('Done state-analysis.mjs');

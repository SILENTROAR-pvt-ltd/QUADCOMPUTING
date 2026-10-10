import fs from 'fs';
import path from 'path';

function walk(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(item)) {
        files = files.concat(walk(full));
      }
    } else if (/\.(ts|tsx|js|mjs)$/.test(item)) {
      files.push(full);
    }
  }
  return files;
}

const allFiles = walk('.');
const r1 = /from\('businesses'\)[\s\S]{0,160}\.limit\(1\)/g;
const r2 = /\.limit\(1\)\s*\.(maybeSingle|single)\(/g;

console.log('=== MULTI-LINE FALLBACK HUNT ===');
console.log("--- Pattern 1: from('businesses')[\\s\\S]{0,160}\\.limit(1) ---");
let hitCount1 = 0;
for (const f of allFiles) {
  const content = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = r1.exec(content)) !== null) {
    hitCount1++;
    console.log(`[Pattern 1 Hit] ${f.replace(/\\/g, '/')} at offset ${m.index}:\n  ${m[0].replace(/\r?\n\s*/g, ' ')}`);
  }
}
if (hitCount1 === 0) console.log('None found.');

console.log("\n--- Pattern 2: \\.limit\\(1\\)\\s*\\.(maybeSingle|single)\\( ---");
let hitCount2 = 0;
for (const f of allFiles) {
  const content = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = r2.exec(content)) !== null) {
    hitCount2++;
    const start = Math.max(0, m.index - 80);
    const end = Math.min(content.length, m.index + 80);
    const snippet = content.slice(start, end).replace(/\r?\n\s*/g, ' ');
    console.log(`[Pattern 2 Hit] ${f.replace(/\\/g, '/')}:\n  ...${snippet}...`);
  }
}
if (hitCount2 === 0) console.log('None found.');

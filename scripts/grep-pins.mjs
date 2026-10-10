import fs from 'fs';
import path from 'path';

function walk(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      files = files.concat(walk(full));
    } else if (/\.(ts|tsx|js|mjs)$/.test(item)) {
      files.push(full);
    }
  }
  return files;
}

const apiFiles = walk('app/api');
const r = /(admin_pin|staff_pin)/i;
console.log('=== GREP admin_pin|staff_pin over app/api ===');
let found = 0;
for (const f of apiFiles) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (r.test(line)) {
      found++;
      console.log(`${f.replace(/\\/g, '/')}:${i + 1}: ${line.trim()}`);
    }
  });
}
if (found === 0) console.log('No hits found.');

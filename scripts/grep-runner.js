const fs = require('fs');
const path = require('path');

// Extract arguments: support grep -rn <query> <dir> or grep -rn "<query>" <dir>
const args = process.argv.slice(2).filter(a => !a.startsWith('-'));
const query = args[0] || '';
const targetDir = args[1] || '.';

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        results = results.concat(walk(fullPath));
      }
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

let matches = 0;
const files = fs.statSync(targetDir).isDirectory() ? walk(targetDir) : [targetDir];

for (const file of files) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes(query)) {
        console.log(`${file}:${idx + 1}:${line}`);
        matches++;
      }
    });
  } catch {}
}

process.exit(matches > 0 ? 0 : 0);

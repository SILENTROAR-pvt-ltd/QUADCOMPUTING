import fs from 'fs';
import path from 'path';

function walk(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      files = files.concat(walk(full));
    } else if (item === 'route.ts' || item === 'route.js') {
      files.push(full);
    }
  }
  return files;
}

const routes = walk('app/api');
const results = [];

for (const file of routes) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('adminDb')) {
    const relPath = file.replace(/\\/g, '/');
    const methods = [];
    ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].forEach(m => {
      if (new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b`).test(content)) {
        methods.push(m);
      }
    });

    let authType = 'none';
    if (content.includes('requireAdmin(')) {
      authType = 'requireAdmin()';
    } else if (content.includes('requireHost(')) {
      authType = 'requireHost()';
    } else if (relPath.startsWith('app/api/guest/')) {
      authType = 'guest-public';
    }

    results.push({
      file: relPath,
      methods: methods.join(', '),
      authType
    });
  }
}

console.log(JSON.stringify(results, null, 2));

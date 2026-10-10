import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve(process.cwd());
const AUDIT_DIR = path.join(ROOT_DIR, 'audit-report');
const OUT_MD = path.join(AUDIT_DIR, '10-cicd-env-deploy.md');
const DRAFT_CI = path.join(AUDIT_DIR, 'draft-ci.yml');

function exists(relPath) {
    return fs.existsSync(path.join(ROOT_DIR, relPath));
}

const infraFiles = {
    '.github/workflows': exists('.github/workflows'),
    'vercel.json': exists('vercel.json'),
    'Dockerfile': exists('Dockerfile'),
    '.husky': exists('.husky'),
    'package.json': exists('package.json'),
    '.env.example': exists('.env.example'),
    'supabase/config.toml': exists('supabase/config.toml')
};

let envExampleKeys = new Set();
if (infraFiles['.env.example']) {
    const content = fs.readFileSync(path.join(ROOT_DIR, '.env.example'), 'utf-8');
    for (const line of content.split('\n')) {
        if (line && !line.startsWith('#') && line.includes('=')) {
            envExampleKeys.add(line.split('=')[0].trim());
        }
    }
}

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
const envUsage = {};
let dynamicConfig = 0;
let edgeConfig = 0;
let middlewareGetUser = 0;

for (const f of files) {
    const relPath = path.relative(ROOT_DIR, f).replace(/\\/g, '/');
    const content = fs.readFileSync(f, 'utf-8');
    const lines = content.split('\n');
    
    // check process.env
    const envRegex = /process\.env\.([A-Z0-9_]+)/g;
    let m;
    while ((m = envRegex.exec(content)) !== null) {
        const key = m[1];
        if (!envUsage[key]) envUsage[key] = [];
        envUsage[key].push(relPath);
    }
    
    // Vercel readiness
    if (content.includes('export const dynamic')) dynamicConfig++;
    if (content.includes("runtime = 'edge'") || content.includes('runtime = "edge"')) edgeConfig++;
    
    if (relPath === 'middleware.ts' || relPath === 'middleware.js') {
        middlewareGetUser = (content.match(/supabase\.auth\.getUser/g) || []).length;
    }
}

let md = `# 10 CI/CD, ENV, and Deployment\n\n`;
md += `This report outlines the deployment infrastructure, environment variables, and Vercel readiness.\n\n`;

md += `## Infrastructure Presence\n`;
for (const [k, v] of Object.entries(infraFiles)) {
    md += `- **${k}**: ${v ? 'Present' : 'Missing'}\n`;
}
md += `\n*Note on git strategy: If .git is missing, version control and branch strategies are non-existent locally.*\n\n`;

md += `## Environment Variables\n`;
md += `| Variable | Used In | In .env.example | Client Exposed? | Notes |\n|---|---|---|---|---|\n`;
for (const [key, files] of Object.entries(envUsage)) {
    const isPublic = key.startsWith('NEXT_PUBLIC_');
    const inExample = envExampleKeys.has(key);
    let note = '';
    if (!isPublic && files.some(f => f.includes('components/') || f.includes('hooks/'))) {
        note = '**WARNING: SERVER SECRET EXPOSED IN CLIENT FILE**';
    }
    md += `| ${key} | ${files.length} files | ${inExample ? 'Yes' : 'No'} | ${isPublic ? 'Yes' : 'No'} | ${note} |\n`;
}

md += `\n## Vercel Readiness\n`;
md += `- Files with \`export const dynamic\`: ${dynamicConfig}\n`;
md += `- Files with Edge runtime: ${edgeConfig}\n`;
md += `- Middleware \`getUser\` calls (cost on every request): ${middlewareGetUser}\n`;

fs.writeFileSync(OUT_MD, md);

const ci = `name: CI
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npx vitest run
      - run: npm run build
      - name: DB Migration Dry-run
        run: |
          npx supabase start
          npx supabase db reset
`;
fs.writeFileSync(DRAFT_CI, ci);
console.log('Done cicd-analysis.mjs');

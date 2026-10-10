import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = path.resolve(process.cwd());
const AUDIT_DIR = path.join(ROOT_DIR, 'audit-report');
const OUT_MD = path.join(AUDIT_DIR, '02-inventory-loc.md');
const OUT_CSV = path.join(AUDIT_DIR, 'loc.csv');

// Skip dirs
const SKIP_DIRS = ['node_modules', '.next', '.git', 'audit-report', 'videos', 'docs'];

let fileList = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.includes(entry.name)) continue;
    const res = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(res);
    } else {
      fileList.push(res);
    }
  }
}

walk(ROOT_DIR);

const stats = [];
const rootClutter = [];
const componentFiles = [];
const tsFiles = [];

for (const file of fileList) {
  const relPath = path.relative(ROOT_DIR, file).replace(/\\/g, '/');
  const dirParts = path.dirname(relPath).split('/');
  const topLevel = dirParts[0] === '.' ? 'ROOT' : dirParts[0];
  const secondLevel = dirParts.length > 1 ? dirParts[1] : '';
  const ext = path.extname(file);
  
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const totalLoc = lines.length;
  let nonBlankLoc = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
      nonBlankLoc++;
    }
  }

  if (topLevel === 'ROOT' && ext !== '') {
      rootClutter.push({ file: relPath, totalLoc });
  }

  if (relPath.startsWith('components/') && ext.match(/\.tsx?$/)) {
      componentFiles.push({ file: relPath, totalLoc });
  }
  
  if (ext.match(/\.tsx?$/) || ext.match(/\.js$/)) {
      tsFiles.push({ file: relPath, totalLoc });
  }

  stats.push({
    file: relPath,
    topLevel,
    secondLevel,
    ext,
    totalLoc,
    nonBlankLoc
  });
}

// Write loc.csv
let csv = 'file,topLevel,secondLevel,ext,totalLoc,nonBlankLoc\n';
for (const s of stats) {
  csv += `${s.file},${s.topLevel},${s.secondLevel},${s.ext},${s.totalLoc},${s.nonBlankLoc}\n`;
}
fs.writeFileSync(OUT_CSV, csv);

// Compute aggregation
const topLevelStats = {};
const secondLevelStats = {};

for (const s of stats) {
  if (!topLevelStats[s.topLevel]) topLevelStats[s.topLevel] = { count: 0, totalLoc: 0, nonBlankLoc: 0 };
  topLevelStats[s.topLevel].count++;
  topLevelStats[s.topLevel].totalLoc += s.totalLoc;
  topLevelStats[s.topLevel].nonBlankLoc += s.nonBlankLoc;
  
  const secKey = `${s.topLevel}/${s.secondLevel}`;
  if (!secondLevelStats[secKey]) secondLevelStats[secKey] = { count: 0, totalLoc: 0, nonBlankLoc: 0 };
  secondLevelStats[secKey].count++;
  secondLevelStats[secKey].totalLoc += s.totalLoc;
  secondLevelStats[secKey].nonBlankLoc += s.nonBlankLoc;
}

// Top 50 largest files
stats.sort((a, b) => b.totalLoc - a.totalLoc);
const top50 = stats.slice(0, 50);

const componentViolations = componentFiles.filter(c => c.totalLoc > 150).sort((a,b) => b.totalLoc - a.totalLoc);

// Root clutter judgment
function judgeRoot(file) {
    if (file.includes('audit-') || file.includes('test-') || file.includes('check_')) return 'ARCHIVE';
    if (['package.json', 'package-lock.json', 'tsconfig.json', 'next.config.mjs', 'tailwind.config.ts', 'postcss.config.mjs', 'vitest.config.ts', '.env.local', '.env.example', 'middleware.ts'].includes(file)) return 'KEEP';
    return 'JUDGMENT: ARCHIVE';
}

// Dead code analysis
// Simple regex to find imports
const allImports = new Set();
for (const file of fileList) {
    if (file.match(/\.(ts|tsx|js|mjs)$/)) {
        const content = fs.readFileSync(file, 'utf-8');
        const matches = content.matchAll(/(?:import|export).*?from\s+['"]([^'"]+)['"]/g);
        for (const match of matches) {
            let importPath = match[1];
            if (importPath.startsWith('@/')) {
                importPath = importPath.replace('@/', '');
            } else if (importPath.startsWith('.')) {
                // resolve relative
                const dirname = path.dirname(path.relative(ROOT_DIR, file));
                importPath = path.normalize(path.join(dirname, importPath)).replace(/\\/g, '/');
            }
            allImports.add(importPath);
        }
    }
}

const deadCode = tsFiles.filter(f => {
    if (f.file.match(/route\.tsx?$/) || f.file.match(/page\.tsx?$/) || f.file.match(/layout\.tsx?$/)) return false;
    if (f.file.startsWith('scripts/') || f.file.startsWith('scratch/') || f.file.startsWith('test-') || f.file.startsWith('e2e-') || f.file.startsWith('audit-')) return false;
    
    // Check if any import matches this file (ignoring extension)
    const base = f.file.replace(/\.(ts|tsx|js|mjs)$/, '');
    for (const imp of allImports) {
        if (imp === base || imp === f.file || imp + '/index' === base) return false;
    }
    return true;
});

// Run vitest
let vitestSummary = '';
try {
    const out = execSync('npx vitest run', { encoding: 'utf-8', stdio: 'pipe' });
    vitestSummary = out;
} catch(e) {
    vitestSummary = e.stdout || e.message;
}

// Build report
let md = `# 02 Inventory & LOC\n\n`;
md += `This report outlines the codebase volume, root clutter, and test coverage.\n\n`;

md += `## Top Level Folders\n`;
md += `| Folder | Files | Total LOC | Code LOC |\n|---|---|---|---|\n`;
for (const [k, v] of Object.entries(topLevelStats)) {
    md += `| ${k} | ${v.count} | ${v.totalLoc} | ${v.nonBlankLoc} |\n`;
}

md += `\n## Component Size Violations (> 150 LOC)\n`;
md += `Our rule: components < 90 LOC wherever possible. Violations count: ${componentViolations.length}\n`;
for (const c of componentViolations.slice(0, 20)) {
    md += `- ${c.file}: ${c.totalLoc} LOC\n`;
}
if (componentViolations.length > 20) md += `- ... and ${componentViolations.length - 20} more.\n`;

md += `\n## Root Clutter\n`;
md += `| File | Total LOC | Recommendation |\n|---|---|---|\n`;
for (const f of rootClutter) {
    md += `| ${f.file} | ${f.totalLoc} | ${judgeRoot(f.file)} |\n`;
}

md += `\n## Dead Code Candidates\n`;
md += `Files never imported (excluding entrypoints):\n`;
for (const d of deadCode.slice(0, 30)) {
    md += `- ${d.file}\n`;
}

md += `\n## Vitest Summary\n`;
md += '```text\n' + vitestSummary.split('\n').slice(-30).join('\n') + '\n```\n';

fs.writeFileSync(OUT_MD, md);
console.log('Done inventory.mjs');

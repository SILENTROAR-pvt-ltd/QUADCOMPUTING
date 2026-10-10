import fs from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve(process.cwd());
const AUDIT_DIR = path.join(ROOT_DIR, 'audit-report');
const OUT_MD = path.join(AUDIT_DIR, '03-frontend-api-db-map.md');
const OUT_CSV = path.join(AUDIT_DIR, 'map.csv');

// Skip dirs
const SKIP_DIRS = ['node_modules', '.next', '.git', 'audit-report', 'videos', 'docs'];

function walk(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.includes(entry.name)) continue;
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
const uiFiles = files.filter(f => f.includes('/app/') || f.includes('/components/') || f.includes('/hooks/') || f.includes('/store/'));
const apiFiles = files.filter(f => f.includes('/app/api/'));
const serviceFiles = files.filter(f => f.includes('/lib/services/') || f.includes('/lib/supabase/'));

const routes = {}; // api_path -> { file, methods: { GET: {...} } }

// Parse API routes
for (const f of apiFiles) {
    const relPath = path.relative(ROOT_DIR, f).replace(/\\/g, '/');
    if (!relPath.endsWith('route.ts') && !relPath.endsWith('route.js')) continue;
    
    // Convert app/api/guest/menu/route.ts -> /api/guest/menu
    let apiPath = '/' + relPath.replace('app/', '').replace('/route.ts', '').replace('/route.js', '');
    // Handle dynamic routes like [id]
    
    const content = fs.readFileSync(f, 'utf-8');
    routes[apiPath] = { file: relPath, methods: {} };
    
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    for (const m of methods) {
        if (content.includes(`export async function ${m}`) || content.includes(`export function ${m}`)) {
            
            // basic analysis
            let auth = 'none';
            if (content.includes('supabase.auth.getUser()') || content.includes('createClient()')) auth = 'guard';
            if (apiPath.includes('guest')) auth = 'guest-public';
            
            let client = 'unknown';
            if (content.includes('adminDb')) client = 'adminDb';
            else if (content.includes('createClient')) client = 'user';
            
            routes[apiPath].methods[m] = {
                loc: content.split('\n').length,
                auth,
                client,
                zod: content.includes('z.object(') || content.includes('z.infer'),
                rateLimited: content.includes('rateLimit') || content.includes('upstash'),
                content
            };
        }
    }
}

// Parse UI files for fetches
const fetches = [];
for (const f of uiFiles) {
    const relPath = path.relative(ROOT_DIR, f).replace(/\\/g, '/');
    const content = fs.readFileSync(f, 'utf-8');
    const lines = content.split('\n');
    
    // match fetch('/api/...') or fetch(`/api/...`)
    const fetchRegex = /fetch\(['"`](\/api\/[^'"`?]+)[^'"`]*['"`]\s*(?:,\s*{(?:[^}]*method:\s*['"]([^'"]+)['"])?[^}]*})?/g;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let match;
        while ((match = fetchRegex.exec(line)) !== null) {
            let apiPath = match[1];
            // Normalize dynamic routes
            apiPath = apiPath.replace(/\$\{.*?\}/g, '[id]');
            
            const method = match[2] ? match[2].toUpperCase() : 'GET';
            fetches.push({
                ui_file: relPath,
                ui_loc: i + 1,
                trigger: 'unknown',
                method,
                api_path: apiPath
            });
        }
    }
}

// Parse supabase calls in UI
const supabaseDirect = [];
for (const f of uiFiles) {
    if (f.includes('/app/api/')) continue;
    const relPath = path.relative(ROOT_DIR, f).replace(/\\/g, '/');
    const content = fs.readFileSync(f, 'utf-8');
    if (content.includes('.from(') || content.includes('.rpc(')) {
        const tablesMatch = content.match(/\.from\(['"]([^'"]+)['"]\)/g) || [];
        const rpcMatch = content.match(/\.rpc\(['"]([^'"]+)['"]\)/g) || [];
        
        if (tablesMatch.length || rpcMatch.length) {
            supabaseDirect.push({
                file: relPath,
                tables: tablesMatch.map(s => s.replace(".from('", "").replace("')", "")),
                rpcs: rpcMatch.map(s => s.replace(".rpc('", "").replace("')", ""))
            });
        }
    }
}

// Write map.csv
let csv = 'ui_file,ui_loc,trigger,method,api_path,route_file,route_loc,auth,client_used,services,tables_read,tables_written,rpcs,in_memory_stores,zod?,rate_limited?\n';

const uncalledRoutes = new Set(Object.keys(routes));
const missingRoutes = new Set();

for (const fetchCall of fetches) {
    let routeFile = '';
    let routeLoc = '';
    let auth = '';
    let clientUsed = '';
    let zod = false;
    let rateLimited = false;
    
    // Simple matching (ignoring [id] replacements perfectly for now)
    let matchedPath = fetchCall.api_path;
    let rData = routes[matchedPath];
    if (!rData) {
        // try to find matching dynamic route
        for (const r of Object.keys(routes)) {
            const regex = new RegExp('^' + r.replace(/\[.*?\]/g, '.*') + '$');
            if (regex.test(matchedPath)) {
                matchedPath = r;
                rData = routes[r];
                break;
            }
        }
    }
    
    if (rData) {
        uncalledRoutes.delete(matchedPath);
        routeFile = rData.file;
        const mData = rData.methods[fetchCall.method] || Object.values(rData.methods)[0];
        if (mData) {
            routeLoc = mData.loc;
            auth = mData.auth;
            clientUsed = mData.client;
            zod = mData.zod;
            rateLimited = mData.rateLimited;
        }
    } else {
        missingRoutes.add(fetchCall.api_path);
    }
    
    csv += `${fetchCall.ui_file},${fetchCall.ui_loc},${fetchCall.trigger},${fetchCall.method},${fetchCall.api_path},${routeFile},${routeLoc},${auth},${clientUsed},,unknown,unknown,unknown,unknown,${zod},${rateLimited}\n`;
}

fs.writeFileSync(OUT_CSV, csv);

// Write MD
let md = `# 03 Frontend API DB Map\n\n`;
md += `This report maps UI fetches to API routes and identifies discrepancies.\n\n`;

md += `## Routes with NO caller\n`;
for (const r of uncalledRoutes) {
    md += `- ${r} (${routes[r].file})\n`;
}

md += `\n## UI fetches to routes that don't exist (404)\n`;
for (const r of missingRoutes) {
    md += `- ${r}\n`;
}

md += `\n## UI code talking directly to Supabase\n`;
for (const u of supabaseDirect) {
    md += `- ${u.file}: Tables: ${u.tables.join(', ')} | RPCs: ${u.rpcs.join(', ')}\n`;
}

fs.writeFileSync(OUT_MD, md);
console.log('Done map-flow.mjs');

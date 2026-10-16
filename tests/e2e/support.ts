import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

/** .env.local merged under the process environment. The live suites read the real project, never the unit-test stubs. */
export function liveEnv(): Record<string, string> {
  let file: Record<string, string> = {};
  try {
    file = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
      .filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]));
  } catch { /* no file: the process environment must carry the keys */ }
  return { ...file, ...process.env } as Record<string, string>;
}

export interface Res { status: number; json: any; ms: number; setCookie: string[] }

export async function call(base: string, path: string, o: { method?: string; body?: unknown; cookie?: string; ip?: string } = {}): Promise<Res> {
  const t = performance.now();
  const res = await fetch(`${base}${path}`, {
    method: o.method || 'GET',
    headers: { 'content-type': 'application/json', ...(o.cookie ? { cookie: o.cookie } : {}), ...(o.ip ? { 'x-forwarded-for': o.ip } : {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json, ms: performance.now() - t, setCookie: (res.headers as any).getSetCookie?.() ?? [] };
}

/** Deletes every row that belongs to the test venue, in as many passes as foreign keys need, then the venue itself. */
export async function cleanUp(db: any, env: Record<string, string>, biz: string) {
  const out = { deleted: 0, left: 0, stuck: [] as string[] };
  if (!biz) return out;
  const spec = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } })
    .then((r) => r.json()).catch(() => null);
  const targets: Array<[string, string]> = [];
  for (const [table, def] of Object.entries<any>(spec?.definitions || {})) {
    if (table === 'businesses') continue;
    for (const col of ['business_id', 'venue_id']) if (def?.properties?.[col]) { targets.push([table, col]); break; }
  }
  for (let pass = 0; pass < 5; pass++) {
    let progressed = false;
    for (const [table, col] of targets) {
      const { data } = await db.from(table).delete().eq(col, biz).select('*');
      if (data?.length) { out.deleted += data.length; progressed = true; }
    }
    if (!progressed) break;
  }
  const { error } = await db.from('businesses').delete().eq('id', biz);
  if (error) out.stuck.push(`businesses: ${error.message}`);
  for (const [table, col] of targets) {
    const { count } = await db.from(table).select('*', { count: 'exact', head: true }).eq(col, biz);
    if (count) { out.left += count; out.stuck.push(`${table}:${count}`); }
  }
  const { count: bizLeft } = await db.from('businesses').select('*', { count: 'exact', head: true }).eq('id', biz);
  out.left += bizLeft || 0;
  return out;
}

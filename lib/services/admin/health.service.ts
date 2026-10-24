// Live health of what the platform runs on, measured now from this server: a database round trip, a Redis ping and
// the server itself. Nothing here is a guess: a service that is not configured says so.
export type HealthLevel = 'good' | 'warning' | 'critical' | 'off';
export interface HealthCheck { id: 'api' | 'database' | 'redis'; label: string; level: HealthLevel; ms: number | null; detail: string }

const level = (ms: number): HealthLevel => (ms < 250 ? 'good' : ms < 800 ? 'warning' : 'critical');
const TIMEOUT_MS = 4000;

async function timed<T>(work: () => Promise<T>): Promise<{ ms: number; value?: T; error?: string }> {
  const t = performance.now();
  try {
    const value = await Promise.race([work(), new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timed out')), TIMEOUT_MS))]);
    return { ms: Math.round(performance.now() - t), value };
  } catch (err: any) {
    return { ms: Math.round(performance.now() - t), error: String(err?.message || err) };
  }
}

async function database(db: any): Promise<HealthCheck> {
  const r = await timed(async () => {
    const { error } = await db.from('subscription_plans').select('id').limit(1);
    if (error) throw new Error(error.message);
  });
  return r.error
    ? { id: 'database', label: 'Supabase database', level: 'critical', ms: r.ms, detail: `Query failed: ${r.error}` }
    : { id: 'database', label: 'Supabase database', level: level(r.ms), ms: r.ms, detail: 'Round trip from this server, Singapore project' };
}

async function redis(): Promise<HealthCheck> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { id: 'redis', label: 'Upstash Redis', level: 'off', ms: null, detail: 'Not configured on this server: rate limits use memory' };
  const r = await timed(async () => {
    const res = await fetch(`${url.replace(/\/$/, '')}/ping`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    const body = await res.json().catch(() => null);
    if (!res.ok || body?.result !== 'PONG') throw new Error(`HTTP ${res.status}`);
  });
  return r.error
    ? { id: 'redis', label: 'Upstash Redis', level: 'critical', ms: r.ms, detail: `Ping failed: ${r.error}` }
    : { id: 'redis', label: 'Upstash Redis', level: level(r.ms), ms: r.ms, detail: 'PING → PONG (rate limits, Vibey budgets)' };
}

function api(startedAt: number): HealthCheck {
  const region = process.env.VERCEL_REGION || 'local';
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
  return { id: 'api', label: 'API server', level: 'good', ms: Math.round(performance.now() - startedAt), detail: `${env} · region ${region} · Node ${process.versions.node}` };
}

/** All checks at once; the API check reports how long this server took to gather the others. */
export async function checkHealth(db: any): Promise<{ checks: HealthCheck[]; overall: HealthLevel; at: string }> {
  const startedAt = performance.now();
  const [d, r] = await Promise.all([database(db), redis()]);
  const checks = [api(startedAt), d, r];
  const live = checks.filter((c) => c.level !== 'off');
  const overall: HealthLevel = live.some((c) => c.level === 'critical') ? 'critical' : live.some((c) => c.level === 'warning') ? 'warning' : 'good';
  return { checks, overall, at: new Date().toISOString() };
}

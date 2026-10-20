// A small shared cache on Upstash Redis, reached over its REST API (no client package; works on the Edge runtime).
// It is a bound on database reads, never the source of truth: every caller must work when it is unconfigured or
// down, and no call here throws. Values are JSON; `null` is a legitimate value (a remembered miss).

const TIMEOUT_MS = 800;

function config(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function command(args: Array<string | number>): Promise<any> {
  const cfg = config();
  if (!cfg) return undefined;
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`shared cache answered ${res.status}`);
  const body = await res.json();
  if (body?.error) throw new Error(String(body.error));
  return body?.result;
}

/** The stored value, `null` for a remembered miss, or `undefined` when nothing is stored or the cache is unreachable. */
export async function sharedGet<T>(key: string): Promise<T | null | undefined> {
  try {
    const raw = await command(['GET', key]);
    if (typeof raw !== 'string') return undefined;
    return JSON.parse(raw) as T | null;
  } catch {
    return undefined;
  }
}

export async function sharedSet(key: string, value: unknown, ttlMs: number): Promise<void> {
  try {
    await command(['SET', key, JSON.stringify(value ?? null), 'PX', Math.max(1000, Math.floor(ttlMs))]);
  } catch {
    // A cache write that fails costs one more database read; nothing else.
  }
}

export async function sharedDel(key: string): Promise<void> {
  try {
    await command(['DEL', key]);
  } catch {}
}

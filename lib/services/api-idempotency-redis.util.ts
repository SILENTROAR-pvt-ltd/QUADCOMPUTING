// lib/services/api-idempotency-redis.util.ts
// The 2-second duplicate window, shared across instances: a retry that lands on another serverless instance is still a
// duplicate. Talks to Upstash's REST API directly, the same way the rate limiter does (no client package).

export const IDEMPOTENCY_WINDOW_MS = 2000;
// The lock outlives a slow run (a settlement can take seconds) so a duplicate cannot start the work again meanwhile.
// It is released as soon as the run ends; this expiry only matters if the instance dies mid-run.
const LOCK_TTL_MS = 30_000;
const WAIT_MS = IDEMPOTENCY_WINDOW_MS + 1000;

export interface SharedStoreConfig {
  url: string;
  token: string;
}

type Stored = { response: unknown; status: number };
type Outcome<T> = { response: T; status: number; duplicate?: boolean };

/** Thrown only before the guarded work has started, when the shared store cannot be read. Safe to fall back on. */
export class IdempotencyStoreUnavailable extends Error {}

export function sharedStoreFromEnv(env: Record<string, string | undefined> = process.env): SharedStoreConfig | null {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function command(cfg: SharedStoreConfig, args: Array<string | number>): Promise<any> {
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(1500),
  });
  if (!res.ok) throw new Error(`shared store answered ${res.status}`);
  const body = await res.json();
  if (body?.error) throw new Error(String(body.error));
  return body?.result;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function readStored(cfg: SharedStoreConfig, resultKey: string): Promise<Stored | null> {
  const raw = await command(cfg, ['GET', resultKey]);
  return typeof raw === 'string' ? (JSON.parse(raw) as Stored) : null;
}

async function takeLock(cfg: SharedStoreConfig, lockKey: string): Promise<boolean> {
  return (await command(cfg, ['SET', lockKey, '1', 'NX', 'PX', LOCK_TTL_MS])) === 'OK';
}

const asDuplicate = <T>(stored: Stored): Outcome<T> => ({ response: stored.response as T, status: stored.status, duplicate: true });

/** Holds the lock and has not run the work yet. Checks the answer once more: the previous run may have just finished. */
async function claimAndRun<T>(
  cfg: SharedStoreConfig,
  lockKey: string,
  resultKey: string,
  work: () => Promise<{ response: T; status?: number }>,
): Promise<Outcome<T>> {
  let late: Stored | null;
  try {
    late = await readStored(cfg, resultKey);
  } catch (err) {
    await command(cfg, ['DEL', lockKey]).catch(() => undefined);
    throw err;
  }
  if (late) {
    await command(cfg, ['DEL', lockKey]).catch(() => undefined);
    return asDuplicate<T>(late);
  }

  let result: { response: T; status?: number };
  try {
    result = await work();
  } catch (err) {
    // A failed run leaves nothing behind, so a retry runs at once, as it did before the shared store.
    await command(cfg, ['DEL', lockKey]).catch(() => undefined);
    throw err;
  }
  const status = result.status || 200;
  // The answer is stored before the lock goes, so no instance sees a moment when the key is free but the answer is missing.
  await command(cfg, ['SET', resultKey, JSON.stringify({ response: result.response, status }), 'PX', IDEMPOTENCY_WINDOW_MS])
    .catch((err) => console.error('[idempotency] could not store the answer; this request is not shared with other instances', err));
  await command(cfg, ['DEL', lockKey]).catch(() => undefined);
  return { response: result.response, status };
}

/**
 * Runs `work` once per key across all instances within the window. A duplicate gets the stored answer; a duplicate that
 * arrives during the run waits for it. Once the work has started, a store error is never retried elsewhere, so the run
 * is not repeated.
 */
export async function withSharedIdempotency<T>(
  cfg: SharedStoreConfig,
  key: string,
  work: () => Promise<{ response: T; status?: number }>,
): Promise<Outcome<T>> {
  const lockKey = `idemp:lock:${key}`;
  const resultKey = `idemp:result:${key}`;

  let stored: Stored | null = null;
  let acquired = false;
  try {
    stored = await readStored(cfg, resultKey);
    if (!stored) acquired = await takeLock(cfg, lockKey);
  } catch (err) {
    throw new IdempotencyStoreUnavailable(err instanceof Error ? err.message : 'shared store unavailable');
  }
  if (stored) return asDuplicate<T>(stored);
  if (acquired) return claimAndRun(cfg, lockKey, resultKey, work);

  // Another request holds the key: wait for its answer, or take the key if that run failed and released it.
  const deadline = Date.now() + WAIT_MS;
  for (;;) {
    await sleep(50);
    const seen = await readStored(cfg, resultKey);
    if (seen) return asDuplicate<T>(seen);
    if (Date.now() >= deadline) {
      throw Object.assign(new Error('This request is already being processed. Try again in a moment.'), { status: 409 });
    }
    if (await takeLock(cfg, lockKey)) return claimAndRun(cfg, lockKey, resultKey, work);
  }
}

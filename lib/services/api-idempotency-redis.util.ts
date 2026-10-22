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

/** Several commands in one round trip, run in order (Upstash's /pipeline). Fails if any of them failed. */
async function pipeline(cfg: SharedStoreConfig, commands: Array<Array<string | number>>): Promise<any[]> {
  const res = await fetch(`${cfg.url.replace(/\/+$/, '')}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(1500),
  });
  if (!res.ok) throw new Error(`shared store answered ${res.status}`);
  const body = await res.json();
  if (!Array.isArray(body)) throw new Error('shared store gave no pipeline answer');
  const failed = body.find((b: any) => b?.error);
  if (failed) throw new Error(String(failed.error));
  return body.map((b: any) => b?.result);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Takes the lock and reads any stored answer in one round trip. The store runs the two in order, so the read sees the
 * store as it is once the lock is held: an answer a previous run has just written is never missed.
 */
async function lockAndRead(cfg: SharedStoreConfig, lockKey: string, resultKey: string): Promise<{ acquired: boolean; stored: Stored | null }> {
  const [set, raw] = await pipeline(cfg, [['SET', lockKey, '1', 'NX', 'PX', LOCK_TTL_MS], ['GET', resultKey]]);
  return { acquired: set === 'OK', stored: typeof raw === 'string' ? (JSON.parse(raw) as Stored) : null };
}

const asDuplicate = <T>(stored: Stored): Outcome<T> => ({ response: stored.response as T, status: stored.status, duplicate: true });
const release = (cfg: SharedStoreConfig, lockKey: string) => command(cfg, ['DEL', lockKey]).catch(() => undefined);

/** Runs follow-up work after the response has gone out (the route passes afterResponse). */
export type Defer = (work: () => Promise<unknown>) => void;

/** Holds the lock, and no answer is stored: runs the work once and shares its answer. */
async function runHeld<T>(
  cfg: SharedStoreConfig,
  lockKey: string,
  resultKey: string,
  work: () => Promise<{ response: T; status?: number }>,
  defer?: Defer,
): Promise<Outcome<T>> {
  let result: { response: T; status?: number };
  try {
    result = await work();
  } catch (err) {
    // A failed run leaves nothing behind, so a retry runs at once, as it did before the shared store.
    await release(cfg, lockKey);
    throw err;
  }
  const status = result.status || 200;
  // The answer is stored, then the lock goes, in one pipelined round trip (the store runs them in order), so no instance
  // sees a moment when the key is free but the answer is missing.
  const share = async () => {
    try {
      await pipeline(cfg, [
        ['SET', resultKey, JSON.stringify({ response: result.response, status }), 'PX', IDEMPOTENCY_WINDOW_MS],
        ['DEL', lockKey],
      ]);
    } catch (err) {
      console.error('[idempotency] could not store the answer; this request is not shared with other instances', err);
      await release(cfg, lockKey);
    }
  };
  // With `defer`, the caller answers first and the answer is shared just after. Still safe: until it is stored the lock is
  // held, so a duplicate arriving in between waits for the stored answer instead of running the work again.
  if (defer) defer(share); else await share();
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
  defer?: Defer,
): Promise<Outcome<T>> {
  const lockKey = `idemp:lock:${key}`;
  const resultKey = `idemp:result:${key}`;

  // One round trip before the work: the lock and the stored answer together. A fresh request (nearly all of them) then
  // runs at once; a retry after the run gets the stored answer.
  let first: { acquired: boolean; stored: Stored | null };
  try {
    first = await lockAndRead(cfg, lockKey, resultKey);
  } catch (err) {
    throw new IdempotencyStoreUnavailable(err instanceof Error ? err.message : 'shared store unavailable');
  }
  if (first.stored) {
    if (first.acquired) await release(cfg, lockKey);
    return asDuplicate<T>(first.stored);
  }
  if (first.acquired) return runHeld(cfg, lockKey, resultKey, work, defer);

  // Another request holds the key: wait for its answer, or take the key if that run failed and released it.
  const deadline = Date.now() + WAIT_MS;
  for (;;) {
    await sleep(50);
    const next = await lockAndRead(cfg, lockKey, resultKey);
    if (next.stored) {
      if (next.acquired) await release(cfg, lockKey);
      return asDuplicate<T>(next.stored);
    }
    if (next.acquired) return runHeld(cfg, lockKey, resultKey, work, defer);
    if (Date.now() >= deadline) {
      throw Object.assign(new Error('This request is already being processed. Try again in a moment.'), { status: 409 });
    }
  }
}

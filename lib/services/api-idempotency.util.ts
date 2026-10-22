// lib/services/api-idempotency.util.ts
import { IdempotencyStoreUnavailable, sharedStoreFromEnv, withSharedIdempotency, type Defer } from './api-idempotency-redis.util';

interface CachedResponse {
  timestamp: number;
  response: any;
  status: number;
}

const idempotencyCache = new Map<string, CachedResponse>();
const inFlightRequests = new Map<string, Promise<any>>();
const WINDOW_MS = 2000; // 2-second anti-frantic window

// Auto-cleanup expired keys every 30 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of Array.from(idempotencyCache.entries())) {
      if (now - val.timestamp > WINDOW_MS * 5) {
        idempotencyCache.delete(key);
      }
    }
  }, 30000);
}

export function generateIdempotencyKey(scope: string, identifier: string, payload?: any): string {
  // The identifier (venue and table) always scopes the key. A client key on its own is only unique within one venue, and
  // the shared store spans every venue.
  const who = identifier.trim().toUpperCase();
  if (payload?.idempotency_key) return `${scope}:${who}:${payload.idempotency_key}`;
  const payloadFingerprint = payload ? hashString(JSON.stringify(payload)) : '0';
  return `${scope}:${who}:${payloadFingerprint}`;
}

// The key used to be the JSON's length, so two different carts of equal length sent within 2 s to one table
// collapsed into one order. A content hash separates them (FNV-1a, 32 bit, plus the length).
function hashString(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${h.toString(36)}-${input.length}`;
}

export function checkIdempotency(key: string): { isDuplicate: boolean; cachedResult?: any; status?: number } {
  const existing = idempotencyCache.get(key);
  if (existing && Date.now() - existing.timestamp < WINDOW_MS) {
    return { isDuplicate: true, cachedResult: existing.response, status: existing.status };
  }
  return { isDuplicate: false };
}

export function recordIdempotentResponse(key: string, response: any, status: number = 200) {
  idempotencyCache.set(key, { timestamp: Date.now(), response, status });
}

/**
 * Runs `fn` once per key within the window. With UPSTASH_REDIS_REST_URL/TOKEN set, the window is shared by every
 * instance; if the shared store cannot be reached before `fn` starts, this instance's own window is used instead.
 */
export async function withIdempotency<T>(
  key: string,
  fn: () => Promise<{ response: T; status?: number }>,
  /** Share the answer with other instances after responding (pass afterResponse); see runHeld. */
  options: { defer?: Defer } = {}
): Promise<{ response: T; status: number; duplicate?: boolean }> {
  const shared = sharedStoreFromEnv();
  if (shared) {
    try {
      return await withSharedIdempotency(shared, key, fn, options.defer);
    } catch (err) {
      if (!(err instanceof IdempotencyStoreUnavailable)) throw err;
      console.warn('[idempotency] shared store unreachable, using this instance only:', err.message);
    }
  }
  return withLocalIdempotency(key, fn);
}

async function withLocalIdempotency<T>(
  key: string,
  fn: () => Promise<{ response: T; status?: number }>
): Promise<{ response: T; status: number; duplicate?: boolean }> {
  const check = checkIdempotency(key);
  if (check.isDuplicate) {
    return { response: check.cachedResult, status: check.status || 200, duplicate: true };
  }

  // Handle in-flight duplicate requests
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)!;
  }

  const execPromise = (async () => {
    try {
      const result = await fn();
      recordIdempotentResponse(key, result.response, result.status || 200);
      return { response: result.response, status: result.status || 200 };
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, execPromise);
  return execPromise;
}

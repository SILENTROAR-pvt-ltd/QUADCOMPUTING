// lib/services/api-idempotency.util.ts

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
  if (payload?.idempotency_key) return `${scope}:${payload.idempotency_key}`;
  const payloadFingerprint = payload ? JSON.stringify(payload).length : 0;
  return `${scope}:${identifier.trim().toUpperCase()}:${payloadFingerprint}`;
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

export async function withIdempotency<T>(
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

// lib/middleware/rate-limiter.ts
import { NextResponse } from 'next/server';

export interface RateLimitConfig {
  key: string;
  limit: number;
  windowMs: number;
  increment?: boolean;
  /**
   * Count on this server instance only, with no call to the shared store. For high, anti-runaway ceilings on reads that
   * every guest phone makes on every push (1,500 a minute): a shared count there cost a ~70 ms network write on every read
   * and grew with every venue, while a per-instance count still stops a runaway script.
   */
  localOnly?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetMs: number;
}

// In-Memory sliding-window storage
const memoryStore = new Map<string, number[]>();

// Auto-cleanup stale keys every 60 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of Array.from(memoryStore.entries())) {
      const valid = timestamps.filter(t => now - t < 15 * 60 * 1000);
      if (valid.length === 0) {
        memoryStore.delete(key);
      } else {
        memoryStore.set(key, valid);
      }
    }
  }, 60000);
}

/** The limiter bucket for a request whose connecting address nothing trustworthy reports. Shared by all such requests. */
export const UNVERIFIED_CLIENT = 'unverified';

/**
 * The client's address for rate-limit keys. Only a header a trusted party set is used; a header the client itself can
 * send is never read on its own, because a client that names its own address gets a fresh limit on every request.
 *
 *  - On Vercel the edge writes x-vercel-forwarded-for, x-real-ip and x-forwarded-for from the connecting address and
 *    drops any copy the client sent, so the first entry is the client.
 *  - Elsewhere the operator declares the proxies in front of the app: TRUSTED_PROXY_HOPS=n means n proxies each append
 *    to x-forwarded-for, so the client is the n-th entry from the end (x-real-ip when a single proxy sets that instead).
 *    TRUST_CF_CONNECTING_IP=1 trusts Cloudflare's header.
 *  - With none of that declared, every request shares one bucket: limits still apply, as one global limit.
 */
export function getClientIp(request: Request): string {
  const h = request.headers;
  if (process.env.VERCEL) {
    const edge = h.get('x-vercel-forwarded-for') || h.get('x-real-ip') || h.get('x-forwarded-for') || '';
    const first = edge.split(',')[0].trim();
    return first || UNVERIFIED_CLIENT;
  }
  const hops = Number(process.env.TRUSTED_PROXY_HOPS || 0);
  if (Number.isInteger(hops) && hops > 0) {
    const forwarded = (h.get('x-forwarded-for') || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (forwarded.length >= hops) return forwarded[forwarded.length - hops];
    const realIp = h.get('x-real-ip')?.trim();
    if (realIp) return realIp;
  }
  if (process.env.TRUST_CF_CONNECTING_IP === '1') {
    const cfIp = h.get('cf-connecting-ip')?.trim();
    if (cfIp) return cfIp;
  }
  return UNVERIFIED_CLIENT;
}

/**
 * Optional Redis REST sliding-window implementation (Upstash or Redis REST proxy)
 * Falls back to in-memory sliding-window if unconfigured or on network failure.
 */
async function checkRedisSlidingWindow(
  key: string,
  limit: number,
  windowMs: number,
  increment: boolean
): Promise<RateLimitResult | null> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) return null;

  try {
    const now = Date.now();
    const clearBefore = now - windowMs;
    const member = `${now}-${Math.random().toString(36).substring(2, 7)}`;

    // Pipeline commands: ZREMRANGEBYSCORE, ZCARD, (optional ZADD), EXPIRE
    const pipeline = [
      ['ZREMRANGEBYSCORE', key, '-inf', String(clearBefore)],
      ['ZCARD', key],
    ];
    if (increment) {
      pipeline.push(['ZADD', key, String(now), member]);
      pipeline.push(['EXPIRE', key, String(Math.ceil(windowMs / 1000))]);
    }

    // A counting check runs as one transaction (multi-exec), so a burst of parallel requests cannot all read the same
    // count before any of them adds itself; a read-only check has no need for one.
    const res = await fetch(`${redisUrl}/${increment ? 'multi-exec' : 'pipeline'}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pipeline),
    });

    if (!res.ok) return null;
    const results = await res.json();
    const count = Number(results?.[1]?.result || 0);

    const allowed = count < limit;
    const remaining = Math.max(0, limit - (increment ? count + 1 : count));
    const retryAfterSeconds = allowed ? 0 : Math.ceil(windowMs / 1000);

    return {
      allowed,
      limit,
      remaining,
      retryAfterSeconds,
      resetMs: now + windowMs,
    };
  } catch (err) {
    console.warn('[RateLimiter] Redis connection failed, falling back to memory store:', err);
    return null;
  }
}

let warnedNoRedis = false;

/**
 * In production the in-memory store is per-instance, so limits are not shared.
 * Set RATE_LIMIT_REQUIRE_REDIS=1 to fail closed (503) instead of degrading.
 */
function assertDistributedStoreAvailable(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const msg =
    'Rate limiter has no Redis (UPSTASH_REDIS_REST_URL/TOKEN) or Redis is unreachable; limits are per-instance only.';
  if (process.env.RATE_LIMIT_REQUIRE_REDIS === '1') {
    throw Object.assign(new Error(msg), { status: 503, code: 'RATE_LIMITER_UNAVAILABLE' });
  }
  if (!warnedNoRedis) {
    warnedNoRedis = true;
    console.error(`[RateLimiter] ${msg}`);
  }
}

/**
 * Sliding window rate limit check.
 */
export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const { key, limit, windowMs, increment = true, localOnly = false } = config;

  // Try Redis if configured (not for a local-only ceiling)
  if (!localOnly) {
    const redisResult = await checkRedisSlidingWindow(key, limit, windowMs, increment);
    if (redisResult) {
      return redisResult;
    }
    assertDistributedStoreAvailable();
  }

  // Memory sliding window (dev/test, or degraded single-instance mode)
  const now = Date.now();
  const cutoff = now - windowMs;
  let timestamps = memoryStore.get(key) || [];

  // Filter out timestamps outside window
  timestamps = timestamps.filter(t => t > cutoff);

  const currentCount = timestamps.length;
  const allowed = currentCount < limit;

  if (allowed && increment) {
    timestamps.push(now);
  }
  memoryStore.set(key, timestamps);

  const remaining = Math.max(0, limit - timestamps.length);
  const oldest = timestamps[0] || now;
  const retryAfterSeconds = allowed ? 0 : Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));

  return {
    allowed,
    limit,
    remaining,
    retryAfterSeconds,
    resetMs: oldest + windowMs,
  };
}

/**
 * Reset rate limit bucket (e.g. on successful PIN verification or admin action)
 */
export async function resetRateLimit(key: string): Promise<void> {
  memoryStore.delete(key);

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (redisUrl && redisToken) {
    try {
      await fetch(`${redisUrl}/del/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${redisToken}` },
      });
    } catch {
      // Ignore network errors on reset
    }
  }
}

// ---------------------------------------------------------------------------
// RULE (b): PIN Verification Rate Limiting (Max 5 fails per 15 min per IP/business)
// ---------------------------------------------------------------------------
export const PIN_FAIL_LIMIT = 5;
export const PIN_FAIL_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function getPinRateLimitKey(ip: string, businessId: string): string {
  const sanitizedIp = ip.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const sanitizedBiz = (businessId || 'unknown').replace(/[^a-zA-Z0-9_.-]/g, '_');
  return `ratelimit:pin_fails:${sanitizedIp}:${sanitizedBiz}`;
}

/**
 * Check if the current IP/business is already rate-limited for PIN failures
 */
export async function isPinRateLimited(ip: string, businessId: string): Promise<RateLimitResult> {
  const key = getPinRateLimitKey(ip, businessId);
  return checkRateLimit({
    key,
    limit: PIN_FAIL_LIMIT,
    windowMs: PIN_FAIL_WINDOW_MS,
    increment: false,
  });
}

/**
 * Record a failed PIN attempt
 */
export async function recordPinFailure(ip: string, businessId: string): Promise<RateLimitResult> {
  const key = getPinRateLimitKey(ip, businessId);
  return checkRateLimit({
    key,
    limit: PIN_FAIL_LIMIT,
    windowMs: PIN_FAIL_WINDOW_MS,
    increment: true,
  });
}

/**
 * Reset failed PIN attempts upon successful PIN authentication
 */
export async function resetPinFailures(ip: string, businessId: string): Promise<void> {
  const key = getPinRateLimitKey(ip, businessId);
  await resetRateLimit(key);
}

// ---------------------------------------------------------------------------
// Guest Order Spam Protection
// ---------------------------------------------------------------------------
// Guests at one venue share its Wi-Fi, so this is a whole venue's ceiling, not one guest's: a full house ordering and
// adding to their bills in a rush can pass 40 a minute. Each order still needs real dishes from this venue's menu and runs
// one at a time per table, so 120 stays a firm bound against a runaway script.
export const GUEST_ORDER_LIMIT = 120; // 120 submissions
export const GUEST_ORDER_WINDOW_MS = 60 * 1000; // per 1 minute

export function getGuestOrderRateLimitKey(ip: string, businessOrTableId: string): string {
  const sanitizedIp = ip.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const sanitizedId = (businessOrTableId || 'anon').replace(/[^a-zA-Z0-9_.-]/g, '_');
  return `ratelimit:guest_order:${sanitizedIp}:${sanitizedId}`;
}

export async function checkGuestOrderRateLimit(
  ip: string,
  businessOrTableId: string
): Promise<RateLimitResult> {
  const key = getGuestOrderRateLimitKey(ip, businessOrTableId);
  return checkRateLimit({
    key,
    limit: GUEST_ORDER_LIMIT,
    windowMs: GUEST_ORDER_WINDOW_MS,
    increment: true,
  });
}

/**
 * Generic per-IP (+ optional subject, e.g. venue id) limiter for open guest endpoints.
 * Returns a 429 response when over the limit, otherwise null. Guests at one venue usually share
 * a single Wi-Fi IP, so callers should pass limits sized for a whole venue, not one person.
 */
export async function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
  subject = '',
  options: { localOnly?: boolean } = {}
): Promise<NextResponse | null> {
  const clean = (v: string) => v.replace(/[^a-zA-Z0-9_.:-]/g, '_');
  const result = await checkRateLimit({
    key: `ratelimit:${clean(scope)}:${clean(getClientIp(request))}:${clean(subject || 'all')}`,
    limit,
    windowMs,
    localOnly: options.localOnly,
  });
  return result.allowed ? null : rateLimitResponse(result);
}

/**
 * Standard HTTP 429 Too Many Requests response builder
 */
export function rateLimitResponse(result: RateLimitResult, customMessage?: string): NextResponse {
  const message =
    customMessage ||
    `Too many requests. Rate limit exceeded. Try again in ${result.retryAfterSeconds} seconds.`;

  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 'RATE_LIMIT_EXCEEDED',
      limit: result.limit,
      remaining: result.remaining,
      retryAfter: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetMs / 1000)),
      },
    }
  );
}

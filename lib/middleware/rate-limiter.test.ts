import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkRateLimit,
  isPinRateLimited,
  recordPinFailure,
  resetPinFailures,
  rateLimitResponse,
  resetRateLimit,
  getClientIp,
  PIN_FAIL_LIMIT,
} from './rate-limiter';

describe('PHASE 2D: Sliding Window Rate Limiter', () => {
  const testIp = '192.168.1.100';
  const testBiz = 'biz_unit_test_' + Date.now();

  beforeEach(async () => {
    await resetPinFailures(testIp, testBiz);
  });

  it('RULE (b): PIN verification enforces max 5 failed attempts per 15 min per IP/business', async () => {
    // Check initial state: 0 fails recorded, 5 remaining
    const initialCheck = await isPinRateLimited(testIp, testBiz);
    expect(initialCheck.allowed).toBe(true);
    expect(initialCheck.remaining).toBe(PIN_FAIL_LIMIT);

    // Record 5 failed attempts (1 to 5)
    for (let i = 1; i <= 5; i++) {
      const res = await recordPinFailure(testIp, testBiz);
      expect(res.remaining).toBe(PIN_FAIL_LIMIT - i);
    }

    // After 5 fails, bucket is exhausted (remaining = 0). Check must be blocked
    const blockedCheck = await isPinRateLimited(testIp, testBiz);
    expect(blockedCheck.allowed).toBe(false);
    expect(blockedCheck.remaining).toBe(0);
    expect(blockedCheck.retryAfterSeconds).toBeGreaterThan(0);

    // 6th attempt must be rejected immediately
    const sixthFail = await recordPinFailure(testIp, testBiz);
    expect(sixthFail.allowed).toBe(false);
    expect(sixthFail.remaining).toBe(0);

    // 429 response structure check
    const response = rateLimitResponse(blockedCheck, 'Too many failed PIN attempts. Maximum 5 allowed per 15 minutes.');
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeTruthy();
    expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(data.retryAfter).toBeGreaterThan(0);
  });

  it('resets failed PIN attempts upon successful PIN authentication', async () => {
    // Record 4 fails
    for (let i = 0; i < 4; i++) {
      await recordPinFailure(testIp, testBiz);
    }

    let status = await isPinRateLimited(testIp, testBiz);
    expect(status.remaining).toBe(1);

    // Successful login resets counter
    await resetPinFailures(testIp, testBiz);

    status = await isPinRateLimited(testIp, testBiz);
    expect(status.allowed).toBe(true);
    expect(status.remaining).toBe(PIN_FAIL_LIMIT);
  });

  it('correctly extracts client IP across various proxy headers', () => {
    // x-forwarded-for: the first entry is client-controlled, so only the last hop a proxy appended is trusted.
    const reqWithForwarded = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' },
    });
    expect(getClientIp(reqWithForwarded)).toBe('150.172.238.178');

    const reqWithRealIp = new Request('http://localhost', {
      headers: { 'x-real-ip': '198.51.100.24' },
    });
    expect(getClientIp(reqWithRealIp)).toBe('198.51.100.24');

    const reqFallback = new Request('http://localhost');
    expect(getClientIp(reqFallback)).toBe('127.0.0.1');
  });

  it('on Vercel, trusts only the edge-set address and ignores a spoofed x-forwarded-for', () => {
    const previous = process.env.VERCEL;
    process.env.VERCEL = '1';
    try {
      const spoofed = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '10.0.0.1',
          'x-vercel-forwarded-for': '203.0.113.50',
        },
      });
      expect(getClientIp(spoofed)).toBe('203.0.113.50');
    } finally {
      if (previous === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = previous;
    }
  });

  it('handles custom sliding window and auto-eviction', async () => {
    const customKey = 'test_window_' + Math.random();
    const limit = 3;
    const windowMs = 50; // 50ms window

    // 3 allowed hits
    const r1 = await checkRateLimit({ key: customKey, limit, windowMs });
    const r2 = await checkRateLimit({ key: customKey, limit, windowMs });
    const r3 = await checkRateLimit({ key: customKey, limit, windowMs });
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);

    // 4th hit blocked
    const r4 = await checkRateLimit({ key: customKey, limit, windowMs });
    expect(r4.allowed).toBe(false);

    // Wait for sliding window to expire
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Next hit after expiry should be allowed again
    const r5 = await checkRateLimit({ key: customKey, limit, windowMs });
    expect(r5.allowed).toBe(true);

    await resetRateLimit(customKey);
  });
});

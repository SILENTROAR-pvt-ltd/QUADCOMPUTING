import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { verifyPinCode } from './verify-pin.service';
import {
  getClientIp,
  recordPinFailure,
  resetPinFailures,
  rateLimitResponse,
} from '@/lib/middleware/rate-limiter';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';

export const dynamic = 'force-dynamic';

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  const { businessId, supabase } = auth;

  const ip = getClientIp(request);

  // RULE (b): Rate limit PIN verification (max 5 fails per 15 min per IP/business).
  // The attempt is counted BEFORE its PIN is looked at, in the same atomic step as the check. Checking first and counting
  // after the verdict lets a burst of parallel guesses all read an empty count and all get a turn.
  const attempt = await recordPinFailure(ip, businessId);
  if (!attempt.allowed) {
    return rateLimitResponse(
      attempt,
      'Too many failed PIN attempts. Maximum 5 allowed per 15 minutes.'
    );
  }

  const body = await request.json().catch(() => ({}));
  const { pinCode } = body || {};

  if (!pinCode) {
    return NextResponse.json({ success: false, error: 'PIN is required' }, { status: 400 });
  }

  const { status, data } = await verifyPinCode(pinCode, businessId, supabase);

  // A failed attempt is already counted against the sliding window (above).
  if (status !== 200 || !data?.success) {
    return NextResponse.json(data, {
      status,
      headers: {
        'X-RateLimit-Limit': String(attempt.limit),
        'X-RateLimit-Remaining': String(attempt.remaining),
        'X-RateLimit-Reset': String(Math.ceil(attempt.resetMs / 1000)),
      },
    });
  }

  // On successful PIN authentication, reset failure counter
  await resetPinFailures(ip, businessId);

  return NextResponse.json(data, { status });
}, 'StaffVerifyPIN');

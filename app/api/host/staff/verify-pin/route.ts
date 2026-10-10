import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { verifyPinCode } from './verify-pin.service';
import {
  getClientIp,
  isPinRateLimited,
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

  // RULE (b): Rate limit PIN verification (max 5 fails per 15 min per IP/business)
  const pinCheck = await isPinRateLimited(ip, businessId);
  if (!pinCheck.allowed) {
    return rateLimitResponse(
      pinCheck,
      'Too many failed PIN attempts. Maximum 5 allowed per 15 minutes.'
    );
  }

  const body = await request.json().catch(() => ({}));
  const { pinCode } = body || {};

  if (!pinCode) {
    return NextResponse.json({ success: false, error: 'PIN is required' }, { status: 400 });
  }

  const { status, data } = await verifyPinCode(pinCode, businessId, supabase);

  // If verification failed, record failure against sliding window
  if (status !== 200 || !data?.success) {
    const failResult = await recordPinFailure(ip, businessId);
    if (!failResult.allowed) {
      return rateLimitResponse(
        failResult,
        'Too many failed PIN attempts. Maximum 5 allowed per 15 minutes.'
      );
    }
    return NextResponse.json(data, {
      status,
      headers: {
        'X-RateLimit-Limit': String(failResult.limit),
        'X-RateLimit-Remaining': String(failResult.remaining),
        'X-RateLimit-Reset': String(Math.ceil(failResult.resetMs / 1000)),
      },
    });
  }

  // On successful PIN authentication, reset failure counter
  await resetPinFailures(ip, businessId);

  return NextResponse.json(data, { status });
}, 'StaffVerifyPIN');

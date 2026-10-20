import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { verifyPinCode } from './verify-pin.service';
import { issueMasterUnlock, MASTER_UNLOCK_COOKIE, MASTER_UNLOCK_SECONDS } from '@/lib/services/security/master-unlock';
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
  const { businessId, supabase, user } = auth;

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

  // Only a correct master PIN clears the counter. A staff PIN is a different secret: letting its success clear the
  // counter would let a guesser alternate wrong master PINs with a known staff PIN and never reach the limit.
  if (data.staff?.isAdmin) await resetPinFailures(ip, businessId);

  const response = NextResponse.json(data, { status });
  // A correct master PIN unlocks the owner's protected sections for a short time. The server holds that unlock in a signed
  // cookie, so the browser cannot set it.
  if (data.staff?.isAdmin && user?.id) {
    const token = issueMasterUnlock(user.id, businessId);
    if (token) {
      response.cookies.set(MASTER_UNLOCK_COOKIE, token, {
        httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: MASTER_UNLOCK_SECONDS,
      });
    }
  }
  return response;
}, 'StaffVerifyPIN');

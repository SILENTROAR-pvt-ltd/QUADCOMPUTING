import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { getClientIp, isPinRateLimited, recordPinFailure, resetPinFailures, rateLimitResponse } from '@/lib/middleware/rate-limiter';
import { setVenuePin } from '@/lib/services/security/venue-pin.service';

export const dynamic = 'force-dynamic';
const LIMIT_MSG = 'Too many wrong PINs. Try again in 15 minutes.';

/**
 * Sets, changes or removes the master PIN (`kind: "admin"`) or the staff POS PIN (`kind: "staff"`).
 * Body: `{ kind, pin | null, currentPin }`. A wrong current PIN counts towards the lock-out.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const ip = getClientIp(request);
    const limit = await isPinRateLimited(ip, auth.businessId);
    if (!limit.allowed) return rateLimitResponse(limit, LIMIT_MSG);

    const body = await request.json().catch(() => ({}));
    const kind = body.kind === 'staff' ? 'staff' : body.kind === 'admin' ? 'admin' : null;
    if (!kind) return NextResponse.json({ error: 'Choose the master or staff PIN.' }, { status: 400 });
    const next = body.pin === null || body.pin === '' ? null : String(body.pin ?? '');

    const r = await setVenuePin(auth.businessId, kind, next, body.currentPin);
    if (!r.ok) {
      if (r.status === 401) {
        const fail = await recordPinFailure(ip, auth.businessId);
        if (!fail.allowed) return rateLimitResponse(fail, LIMIT_MSG);
      }
      return NextResponse.json({ error: r.error }, { status: r.status });
    }
    await resetPinFailures(ip, auth.businessId);
    return NextResponse.json({ success: true, isAdminPinSet: r.isAdminPinSet, isStaffPinSet: r.isStaffPinSet }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'HostSecurityPinPOST');
  }
}, 'HostSecurityPinPOST');

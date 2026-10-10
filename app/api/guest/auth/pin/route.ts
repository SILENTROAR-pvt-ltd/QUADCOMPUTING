import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { sessionCookie } from '@/lib/auth/guest-auth';
import { accountForRequest, changeGuestPin } from '@/lib/services/guest-auth/guest-account.service';

export const dynamic = 'force-dynamic';

/** POST /api/guest/auth/pin — change the signed-in guest's PIN. Ends their other sessions. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const validation = await validateGuestAccess(body?.venue_id || body?.business_id || body?.cafe_id);
  if (validation.error) return validation.error;

  const limited = await enforceRateLimit(request, 'guest_pin_change', 10, 10 * 60_000, validation.businessId);
  if (limited) return limited;

  const db = adminDb();
  const account = await accountForRequest(db, request, validation.businessId);
  if (!account) {
    return NextResponse.json({ success: false, error: 'Sign in to change your PIN.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  const result = await changeGuestPin(db, account, { currentPin: body?.current_pin, newPin: body?.new_pin });
  if (!result.ok) {
    const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
    if (result.retryAfterSeconds) headers['Retry-After'] = String(result.retryAfterSeconds);
    return NextResponse.json({ success: false, error: result.error }, { status: result.status, headers });
  }

  const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.headers.append('Set-Cookie', sessionCookie(result.sessionToken));
  return response;
}, 'GuestAuthPinChange');

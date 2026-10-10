import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { readWalletSecret } from '@/lib/services/wallet/wallet-claim.service';
import { signIn, summarize } from '@/lib/services/guest-auth/guest-account.service';
import { sessionCookie } from '@/lib/auth/guest-auth';

export const dynamic = 'force-dynamic';

/** POST /api/guest/auth/login — sign in with handle + PIN at this venue. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const validation = await validateGuestAccess(body?.venue_id || body?.business_id || body?.cafe_id);
  if (validation.error) return validation.error;

  // Throttle guessing per venue and per client; the account lockout also applies.
  const limited = await enforceRateLimit(request, 'guest_auth_login', 10, 10 * 60_000, validation.businessId);
  if (limited) return limited;

  const result = await signIn({
    db: adminDb(),
    businessId: validation.businessId,
    rawHandle: body?.handle,
    pin: body?.pin,
    walletSecret: readWalletSecret(request),
  });
  if (!result.ok) {
    const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
    if (result.retryAfterSeconds) headers['Retry-After'] = String(result.retryAfterSeconds);
    return NextResponse.json({ success: false, error: result.error }, { status: result.status, headers });
  }

  const response = NextResponse.json(
    { success: true, account: summarize(result.account) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
  response.headers.append('Set-Cookie', sessionCookie(result.sessionToken));
  return response;
}, 'GuestAuthLogin');

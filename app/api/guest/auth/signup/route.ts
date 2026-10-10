import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { readWalletSecret } from '@/lib/services/wallet/wallet-claim.service';
import { signUp, summarize } from '@/lib/services/guest-auth/guest-account.service';
import { sessionCookie } from '@/lib/auth/guest-auth';

export const dynamic = 'force-dynamic';

/** POST /api/guest/auth/signup — create a guest account and start a session at this venue. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const validation = await validateGuestAccess(body?.venue_id || body?.business_id || body?.cafe_id);
  if (validation.error) return validation.error;

  const limited = await enforceRateLimit(request, 'guest_auth_signup', 5, 10 * 60_000, validation.businessId);
  if (limited) return limited;

  const result = await signUp({
    db: adminDb(),
    businessId: validation.businessId,
    rawHandle: body?.handle,
    rawName: body?.name,
    rawPhone: body?.phone,
    pin: body?.pin,
    avatar: body?.avatar,
    travellerType: body?.traveller_type,
    intro: body?.intro,
    walletSecret: readWalletSecret(request),
  });
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status, headers: { 'Cache-Control': 'no-store' } });
  }

  const response = NextResponse.json(
    { success: true, account: summarize(result.account) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
  response.headers.append('Set-Cookie', sessionCookie(result.sessionToken));
  return response;
}, 'GuestAuthSignup');

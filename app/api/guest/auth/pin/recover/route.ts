import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { sessionCookie } from '@/lib/auth/guest-auth';
import { readWalletSecret } from '@/lib/services/wallet/wallet-claim.service';
import { recoverGuestPin } from '@/lib/services/guest-auth/guest-account.service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/guest/auth/pin/recover — forgot PIN, self-service: the account's mobile number, on the
 * device that holds the account's wallet claim. Sets the new PIN and signs this device in.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const validation = await validateGuestAccess(body?.venue_id || body?.business_id || body?.cafe_id);
  if (validation.error) return validation.error;

  // Tight limit: this is a recovery path. Per venue, and per client address.
  const limited = await enforceRateLimit(request, 'guest_pin_recover', 5, 60 * 60_000, validation.businessId);
  if (limited) return limited;

  const result = await recoverGuestPin(adminDb(), {
    businessId: validation.businessId,
    rawHandle: body?.handle,
    rawPhone: body?.phone,
    newPin: body?.new_pin,
    walletSecret: readWalletSecret(request),
  });
  if (!result.ok) {
    const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
    if (result.retryAfterSeconds) headers['Retry-After'] = String(result.retryAfterSeconds);
    return NextResponse.json({ success: false, error: result.error }, { status: result.status, headers });
  }

  const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.headers.append('Set-Cookie', sessionCookie(result.sessionToken));
  return response;
}, 'GuestAuthPinRecover');

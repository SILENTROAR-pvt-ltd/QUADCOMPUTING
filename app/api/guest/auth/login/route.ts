import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { readWalletSecret } from '@/lib/services/wallet/wallet-claim.service';
import { normalizeHandle, sessionCookie } from '@/lib/auth/guest-auth';
import { summarize } from '@/lib/services/guest-auth/guest-account.service';
import { pinSignIn } from '@/lib/services/guest-auth/vibers-pin-login.service';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };

/**
 * POST /api/guest/auth/login — sign in with @handle + 6-digit PIN (the PIN set while making the Vibers profile).
 * Body: { venue_id, handle, pin }. Wrong guesses are limited three ways: per address, per handle, and by the account's
 * own lockout. Every refusal says the same thing, so this cannot be used to find out which handles exist.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const validation = await validateGuestAccess(body?.venue_id || body?.business_id || body?.cafe_id);
  if (validation.error) return validation.error;

  const byAddress = await enforceRateLimit(request, 'guest_pin_login', 30, 10 * 60_000, validation.businessId);
  if (byAddress) return byAddress;
  const handle = normalizeHandle(body?.handle);
  if (handle) {
    const byHandle = await enforceRateLimit(request, 'guest_pin_login_handle', 8, 10 * 60_000, handle);
    if (byHandle) return byHandle;
  }

  const result = await pinSignIn({ db: adminDb(), businessId: validation.businessId, rawHandle: body?.handle, pin: body?.pin, walletSecret: readWalletSecret(request) });
  if (!result.ok) {
    const headers: Record<string, string> = { ...noStore };
    if (result.retryAfterSeconds) headers['Retry-After'] = String(result.retryAfterSeconds);
    return NextResponse.json({ success: false, error: result.error }, { status: result.status, headers });
  }

  const response = NextResponse.json({ success: true, account: summarize(result.account) }, { headers: noStore });
  response.headers.append('Set-Cookie', sessionCookie(result.sessionToken));
  return response;
}, 'GuestAuthLogin');

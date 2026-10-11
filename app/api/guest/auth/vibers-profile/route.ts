import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { readWalletSecret } from '@/lib/services/wallet/wallet-claim.service';
import { summarize } from '@/lib/services/guest-auth/guest-account.service';
import { createVibersProfile } from '@/lib/services/guest-auth/vibers-profile.service';
import { connectVenue, signedInUser } from '@/lib/services/guest-auth/vibers-connect.service';
import { sessionCookie } from '@/lib/auth/guest-auth';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };

/**
 * POST /api/guest/auth/vibers-profile — the signed-in person's Vibers profile (handle, name, phone),
 * then their guest session at this venue. Body: { venue_id, handle, name, phone, traveller_type?, intro?, legacy_pin? }.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const validation = await validateGuestAccess(body?.venue_id || body?.business_id || body?.cafe_id);
  if (validation.error) return validation.error;

  const user = await signedInUser();
  if (!user) return NextResponse.json({ success: false, error: 'Sign in to your Vibers account first.' }, { status: 401, headers: noStore });

  // Old-PIN guesses are throttled on top of the per-account lockout.
  const limited = await enforceRateLimit(request, 'vibers_profile', 10, 10 * 60_000, user.id);
  if (limited) return limited;

  const db = adminDb();
  const walletSecret = readWalletSecret(request);
  const created = await createVibersProfile(db, {
    userId: user.id, rawHandle: body?.handle, rawName: body?.name, rawPhone: body?.phone,
    travellerType: body?.traveller_type, intro: body?.intro, legacyPin: body?.legacy_pin, walletSecret,
  });
  if (!created.ok) {
    return NextResponse.json({ success: false, error: created.error, code: created.code }, { status: created.status, headers: noStore });
  }

  const connected = await connectVenue(db, user.id, validation.businessId, walletSecret);
  if (!connected.ok) return NextResponse.json({ success: false, error: connected.error, code: connected.code }, { status: connected.status, headers: noStore });

  const response = NextResponse.json({ success: true, account: summarize(connected.account) }, { headers: noStore });
  response.headers.append('Set-Cookie', sessionCookie(connected.sessionToken));
  return response;
}, 'GuestVibersProfile');

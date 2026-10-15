import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { readWalletSecret } from '@/lib/services/wallet/wallet-claim.service';
import { summarize } from '@/lib/services/guest-auth/guest-account.service';
import { createVibersProfile } from '@/lib/services/guest-auth/vibers-profile.service';
import { connectVenue, signedInUser } from '@/lib/services/guest-auth/vibers-connect.service';
import { hashPin, isValidPin, sessionCookie, type PinHash } from '@/lib/auth/guest-auth';
import { isWeakPin, WEAK_PIN_MESSAGE } from '@/lib/auth/pin-strength';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };

/**
 * POST /api/guest/auth/vibers-profile — the signed-in person's Vibers profile (handle, name, phone),
 * then their guest session at this venue. Body: { venue_id, handle, name, phone, traveller_type?, intro?, legacy_pin?, new_pin? }.
 * 
ew_pin is the 6-digit PIN they choose now, to sign in later with their @handle at any property.
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

  // A new PIN, when sent, must be 6 digits and not an obvious one. Checked before anything is written.
  let newPin: PinHash | null = null;
  if (body?.new_pin !== undefined && body?.new_pin !== null && body?.new_pin !== '') {
    if (!isValidPin(body.new_pin)) return NextResponse.json({ success: false, error: 'Your PIN must be exactly 6 digits.' }, { status: 400, headers: noStore });
    if (isWeakPin(body.new_pin)) return NextResponse.json({ success: false, error: WEAK_PIN_MESSAGE }, { status: 400, headers: noStore });
    newPin = await hashPin(body.new_pin);
  }

  const db = adminDb();
  const walletSecret = readWalletSecret(request);
  const created = await createVibersProfile(db, {
    userId: user.id, rawHandle: body?.handle, rawName: body?.name, rawPhone: body?.phone,
    travellerType: body?.traveller_type, intro: body?.intro, legacyPin: body?.legacy_pin, walletSecret,
  });
  if (!created.ok) {
    return NextResponse.json({ success: false, error: created.error, code: created.code }, { status: created.status, headers: noStore });
  }

  const connected = await connectVenue(db, user.id, validation.businessId, walletSecret, newPin);
  if (!connected.ok) return NextResponse.json({ success: false, error: connected.error, code: connected.code }, { status: connected.status, headers: noStore });

  const response = NextResponse.json({ success: true, account: summarize(connected.account) }, { headers: noStore });
  response.headers.append('Set-Cookie', sessionCookie(connected.sessionToken));
  return response;
}, 'GuestVibersProfile');

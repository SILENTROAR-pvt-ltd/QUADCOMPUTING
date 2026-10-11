import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { accountForRequest, summarize } from '@/lib/services/guest-auth/guest-account.service';
import { connectVenue, signedInUser } from '@/lib/services/guest-auth/vibers-connect.service';
import { readWalletSecret } from '@/lib/services/wallet/wallet-claim.service';
import { sessionCookie } from '@/lib/auth/guest-auth';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

/**
 * GET /api/guest/auth/me?venue_id= — the signed-in guest at this venue, if any.
 * Someone signed in with their Vibers account (the same login as QC) is connected to this venue on
 * their first visit: their guest record here is created and a guest session starts.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const validation = await validateGuestAccess(searchParams.get('venue_id') || searchParams.get('cafe_id'));
  if (validation.error) return validation.error;

  const db = adminDb();
  const account = await accountForRequest(db, request, validation.businessId);
  if (account) return NextResponse.json({ success: true, signedIn: true, account: summarize(account) }, { headers: noStore });

  const user = await signedInUser();
  if (!user) return NextResponse.json({ success: true, signedIn: false, account: null }, { headers: noStore });

  const connected = await connectVenue(db, user.id, validation.businessId, readWalletSecret(request));
  if (!connected.ok) {
    return NextResponse.json({
      success: true, signedIn: false, account: null,
      needsProfile: connected.code === 'needs_profile', notice: connected.code === 'needs_profile' ? null : connected.error,
    }, { headers: noStore });
  }
  const response = NextResponse.json({ success: true, signedIn: true, account: summarize(connected.account) }, { headers: noStore });
  response.headers.append('Set-Cookie', sessionCookie(connected.sessionToken));
  return response;
}, 'GuestAuthMe');

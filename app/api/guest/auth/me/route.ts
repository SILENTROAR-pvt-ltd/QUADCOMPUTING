import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { accountForRequest, summarize } from '@/lib/services/guest-auth/guest-account.service';

export const dynamic = 'force-dynamic';

/** GET /api/guest/auth/me?venue_id= — the signed-in guest at this venue, if any. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const validation = await validateGuestAccess(searchParams.get('venue_id') || searchParams.get('cafe_id'));
  if (validation.error) return validation.error;

  const account = await accountForRequest(adminDb(), request, validation.businessId);
  return NextResponse.json(
    { success: true, signedIn: Boolean(account), account: account ? summarize(account) : null },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}, 'GuestAuthMe');

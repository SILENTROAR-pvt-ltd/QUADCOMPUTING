import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { guestContact } from '@/lib/services/live-events/guest-identity';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guest/events/prefill?venue_id= — what the "I'm Interested" form fills in for this guest: their name, Vibers
 * ID and email from their own sign-in. A guest who is not signed in gets an empty form to type into.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const validation = await validateGuestAccess(searchParams.get('venue_id') || searchParams.get('cafe_id'));
  if (validation.error) return validation.error;
  const me = await guestContact(adminDb(), request, validation.businessId);
  return NextResponse.json(
    { success: true, signedIn: me.signedIn, name: me.name, handle: me.handle, email: me.email, hasPhone: Boolean(me.phone) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}, 'GuestEventsPrefill');

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { getVenueStatus } from '@/lib/services/reservations/venue-hours.service';

export const dynamic = 'force-dynamic';

/** GET /api/guest/venue-status?cafe_id= — is the venue open right now, and which services are enabled. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const validation = await validateGuestAccess(searchParams.get('cafe_id') || searchParams.get('venue_id'));
  if (validation.error) return validation.error;

  const status = await getVenueStatus(adminDb(), validation.businessId);
  return NextResponse.json({ success: true, status }, {
    headers: { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60' },
  });
}, 'GuestVenueStatusGET');

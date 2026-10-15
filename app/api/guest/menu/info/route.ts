import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { loadMenuInfo } from '@/lib/services/menu-info/menu-info';
import { loadGstStatus } from '@/lib/services/billing/gst-policy';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guest/menu/info?cafe_id= — the venue's public menu information, and whether it charges GST (true only for a verified
 * GSTIN, the same rule that adds GST to a bill). Read-only, no sign-in needed. `gst_applicable` is null when it cannot be read.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const url = new URL(request.url);
  const venue = await validateGuestAccess(url.searchParams.get('cafe_id') || url.searchParams.get('business_id'));
  if (venue.error) return venue.error;
  const db = adminDb();
  const [info, gst] = await Promise.all([
    loadMenuInfo(db, venue.businessId),
    loadGstStatus(db, venue.businessId).then((g) => g.canCharge).catch(() => null),
  ]);
  return NextResponse.json({ success: true, info, gst_applicable: gst }, { headers: { 'Cache-Control': 'no-store' } });
}, 'GuestMenuInfoGET');

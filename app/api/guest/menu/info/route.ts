import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { loadMenuInfo } from '@/lib/services/menu-info/menu-info';

export const dynamic = 'force-dynamic';

/** GET /api/guest/menu/info?cafe_id= — the venue's public menu information. Read-only, no sign-in needed. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const url = new URL(request.url);
  const venue = await validateGuestAccess(url.searchParams.get('cafe_id') || url.searchParams.get('business_id'));
  if (venue.error) return venue.error;
  const info = await loadMenuInfo(adminDb(), venue.businessId);
  return NextResponse.json({ success: true, info }, { headers: { 'Cache-Control': 'no-store' } });
}, 'GuestMenuInfoGET');

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { getAvailableSlotsForDate } from '@/lib/services/reservations/venue-hours.service';

export const dynamic = 'force-dynamic';

/** GET /api/guest/slots?cafe_id=&date=YYYY-MM-DD — available reservation time slots. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const validation = await validateGuestAccess(searchParams.get('cafe_id') || searchParams.get('venue_id'));
  if (validation.error) return validation.error;

  const date = searchParams.get('date') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });

  const slots = await getAvailableSlotsForDate(adminDb(), validation.businessId, date);
  return NextResponse.json({ success: true, slots }, {
    headers: { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600' },
  });
}, 'GuestSlotsGET');

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { accountForRequest } from '@/lib/services/guest-auth/guest-account.service';
import { todayIst } from '@/lib/services/reservations/venue-hours.service';
import { loadStayBusiness } from '@/lib/services/stay/room-route.util';
import { staysForAccount } from '@/lib/services/stay/stay-hub.service';
import { findMyRoom, venueStaySummary } from '@/lib/services/stay/stay-hub-room.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guest/stay/mine?venue_id=<id>[&scope=all]
 * The guest's stays, in one place: the room this phone is confirmed in at the venue, the reservations made under their
 * Vibers ID (this venue, or every venue with scope=all), and what the venue offers (rooms, lowest rate, free now).
 * Nothing about a stay is revealed without the sign-in session or the room session that proves it is theirs.
 */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const validation = await validateGuestAccess(searchParams.get('venue_id') || searchParams.get('cafe_id'));
    if (validation.error) return validation.error;
    const businessId = validation.businessId;
    const limited = await enforceRateLimit(request, 'stay_mine', 120, 60_000, businessId);
    if (limited) return limited;

    const db = adminDb();
    const cookie = request.headers.get('cookie');
    const [business, summary, myRoom, account] = await Promise.all([
      loadStayBusiness(db, businessId), venueStaySummary(db, businessId), findMyRoom(db, businessId, cookie), accountForRequest(db, request, businessId),
    ]);
    const everywhere = searchParams.get('scope') === 'all';
    const stays = account ? await staysForAccount(db, account, { businessId: everywhere ? null : businessId, limit: everywhere ? 40 : 10 }, todayIst()) : [];

    return NextResponse.json({
      success: true,
      venue: {
        id: businessId, name: business?.business_name || business?.name || 'Venue', slug: business?.slug || null,
        self_checkin_enabled: Boolean(business?.self_checkin_enabled), in_room_dining_enabled: business?.in_room_dining_enabled !== false, ...summary,
      },
      my_room: myRoom,
      signed_in: Boolean(account),
      stays,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'StayMineGET');
  }
}, 'StayMineGET');

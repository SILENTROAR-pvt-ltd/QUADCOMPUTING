import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { createStayBooking, readStayBookingInput, StayBookingError } from '@/lib/services/stay/stay-booking.service';
import { loadStayBusiness } from '@/lib/services/stay/room-route.util';
import { readExpectedArrival, readPolicies } from '@/lib/services/stay/stay-policy';
import { accountForRequest } from '@/lib/services/guest-auth/guest-account.service';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, number> = { INVALID: 400, NOT_FOUND: 404, NO_AVAILABILITY: 409, FAILED: 500 };

/** POST /api/guest/stay/book: reserve a room type for a date range, pay on arrival. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const validation = await validateGuestAccess(body?.venue ?? body?.cafe_id ?? '');
    if (validation.error) return validation.error;
    const businessId = validation.businessId;

    // A handful per minute per address: a family books once; a script does not get to fill the calendar.
    const limited = await enforceRateLimit(request, 'stay_book', 6, 60_000, businessId);
    if (limited) return limited;

    const db = adminDb();
    // Signed in with a Vibers ID: the booking is theirs, and their account supplies the name and mobile they did not type.
    const [business, account] = await Promise.all([loadStayBusiness(db, businessId), accountForRequest(db, request, businessId)]);
    const input = readStayBookingInput(body, account);
    // The stated arrival is kept only if it is one the owner offers; anything else is a standard arrival.
    input.expectedArrival = readExpectedArrival(input.expectedArrival, readPolicies(business?.stay_policies));

    const result = await createStayBooking(db, businessId, input);
    return NextResponse.json({
      success: true,
      booking: {
        code: result.code,
        expected_arrival: result.booking.expected_arrival || 'standard',
        status: result.booking.status,
        check_in: result.booking.check_in,
        check_out: result.booking.check_out,
        nights: result.nights,
        guests: result.booking.guests,
        guest_name: result.booking.guest_name,
        room_type: result.category.name,
        price_per_night: Number(result.category.price) || 0,
        estimated_total: (Number(result.category.price) || 0) * result.nights,
        linked_to_account: Boolean(account),
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof StayBookingError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: STATUS[error.code] || 500 });
    }
    return handleApiError(error, request, 'StayBookPOST');
  }
}, 'StayBookPOST');

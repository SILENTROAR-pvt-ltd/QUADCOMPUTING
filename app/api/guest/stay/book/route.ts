import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { createStayBooking, readStayBookingInput, StayBookingError } from '@/lib/services/stay/stay-booking.service';

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

    const result = await createStayBooking(adminDb(), businessId, readStayBookingInput(body));
    return NextResponse.json({
      success: true,
      booking: {
        code: result.code,
        status: result.booking.status,
        check_in: result.booking.check_in,
        check_out: result.booking.check_out,
        nights: result.nights,
        guests: result.booking.guests,
        guest_name: result.booking.guest_name,
        room_type: result.category.name,
        price_per_night: Number(result.category.price) || 0,
        estimated_total: (Number(result.category.price) || 0) * result.nights,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof StayBookingError) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: STATUS[error.code] || 500 });
    }
    return handleApiError(error, request, 'StayBookPOST');
  }
}, 'StayBookPOST');

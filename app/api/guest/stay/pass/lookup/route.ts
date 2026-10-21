import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { normalizeConfirmationCode } from '@/lib/services/stay/booking-code';
import { phoneMatches } from '@/lib/services/stay/room-access.service';
import { loadStayBusiness } from '@/lib/services/stay/room-route.util';
import { passToken } from '@/lib/services/stay/pass-token';
import { resolveStay, StayPassError } from '@/lib/services/stay/stay-pass.service';
import { readPolicies } from '@/lib/services/stay/stay-policy';
import { OPEN_BOOKING } from '@/lib/services/stay/booking-link.service';

export const dynamic = 'force-dynamic';

const NOT_FOUND = () => NextResponse.json({ success: false, error: 'We could not match that code and number. Check them, or ask at the desk.', code: 'NOT_FOUND' }, { status: 404 });

/**
 * POST /api/guest/stay/pass/lookup { venue, code, phone_last4 }
 * A guest who reserved asks where their check-in stands. Unpaid: what the desk will bill. Paid: the check-in link,
 * handed over only to someone who knows both the booking code and the last four digits of the phone it was made with.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const validation = await validateGuestAccess(body?.venue ?? '');
    if (validation.error) return validation.error;
    const businessId = validation.businessId;

    // Two guesses at a six-character code and a four-digit number: a few tries per address, not a search.
    const limited = await enforceRateLimit(request, 'stay_pass_lookup', 10, 10 * 60_000, businessId);
    if (limited) return limited;

    const code = normalizeConfirmationCode(body?.code);
    if (!code) return NOT_FOUND();
    const db = adminDb();
    const { data: booking, error } = await db.from('stay_booking_requests').select('*').eq('business_id', businessId).eq('confirmation_code', code).maybeSingle();
    if (error) throw error;
    if (!booking || !phoneMatches({ guest_phone: booking.guest_phone }, body?.phone_last4)) return NOT_FOUND();

    const summary = { first_name: String(booking.guest_name).trim().split(/\s+/)[0], check_in: booking.check_in, check_out: booking.check_out, guests: booking.guests };
    if (booking.status === 'checked_in') return NextResponse.json({ success: true, state: 'checked_in', booking: summary }, { headers: { 'Cache-Control': 'no-store' } });
    if (!(OPEN_BOOKING as readonly string[]).includes(booking.status)) return NextResponse.json({ success: true, state: 'closed', booking: summary }, { headers: { 'Cache-Control': 'no-store' } });

    const { data: pass } = await db.from('stay_passes').select('id, status, token_version, expires_at').eq('booking_id', booking.id).neq('status', 'void').maybeSingle();
    if (pass?.status === 'issued') {
      return NextResponse.json({ success: true, state: 'ready', pass_token: passToken(pass.id, pass.token_version), booking: summary }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (pass?.status === 'used') return NextResponse.json({ success: true, state: 'checked_in', booking: summary }, { headers: { 'Cache-Control': 'no-store' } });

    // Not billed yet: show what the desk will charge, so the guest arrives at the desk knowing the amount.
    let amount: number | null = null;
    try {
      const business = await loadStayBusiness(db, businessId);
      amount = (await resolveStay(db, businessId, { bookingId: booking.id }, readPolicies(business?.stay_policies))).quote.amount;
    } catch (e) {
      if (!(e instanceof StayPassError)) throw e;
    }
    return NextResponse.json({ success: true, state: 'unpaid', amount, booking: summary }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'StayPassLookupPOST');
  }
}, 'StayPassLookupPOST');

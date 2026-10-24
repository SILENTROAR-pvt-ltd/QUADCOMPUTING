import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { todayIst } from '@/lib/services/reservations/venue-hours.service';
import { createStayBooking, readStayBookingInput, StayBookingError } from '@/lib/services/stay/stay-booking.service';
import { readExpectedArrival, readPolicies } from '@/lib/services/stay/stay-policy';
import { requireFeature } from '@/lib/services/billing/feature-gate';

export const dynamic = 'force-dynamic';

const ACTIONS: Record<string, string> = { confirm: 'confirmed', decline: 'declined', cancel: 'cancelled', no_show: 'no_show' };
const SELECT = 'id, category_id, room_id, check_in, check_out, guests, guest_name, guest_phone, guest_email, note, status, confirmation_code, source, created_at, expected_arrival, category:room_categories(id, name, price)';

/** GET /api/host/accommodations/bookings?scope=upcoming|all: the venue's advance bookings, soonest first. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId } = auth;
    const scope = new URL(request.url).searchParams.get('scope') || 'upcoming';

    // The table is server-only (RLS on, no grants to signed-in users), so the service role reads it, scoped to the venue.
    let q = adminDb().from('stay_booking_requests').select(SELECT).eq('business_id', businessId);
    if (scope === 'upcoming') q = q.gte('check_out', todayIst()).in('status', ['requested', 'confirmed']);
    const { data, error } = await q.order('check_in', { ascending: true }).limit(200);
    if (error) throw error;

    // Each booking's pass (paid room, link issued), so the desk sees who still has to pay and who is ready to check in.
    const ids = (data || []).map((b: any) => b.id);
    const { data: passes } = ids.length
      ? await adminDb().from('stay_passes').select('id, booking_id, status, amount, payment_method, paid_at').in('booking_id', ids).neq('status', 'void')
      : { data: [] as any[] };
    const byBooking = new Map<string, any>((passes || []).map((p: any) => [p.booking_id, p]));
    const bookings = (data || []).map((b: any) => ({ ...b, pass: byBooking.get(b.id) || null }));
    return NextResponse.json({ success: true, bookings }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'HostStayBookingsGET');
  }
}, 'HostStayBookingsGET');

/**
 * POST /api/host/accommodations/bookings: the desk reserves a room for a guest who phoned or walked up. The same checks as a
 * guest's own booking (dates, availability for every night, one code per booking); the booking is marked as made at the desk.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId } = auth;
    // A new reservation needs Rhodium (rooms); the ones already booked are confirmed, checked in and settled as usual.
    const blocked = await requireFeature(businessId, 'rooms');
    if (blocked) return blocked;
    const body = await request.json().catch(() => ({}));
    const db = adminDb();
    const { data: biz } = await db.from('businesses').select('stay_policies').eq('id', businessId).maybeSingle();
    const input = readStayBookingInput(body);
    input.expectedArrival = readExpectedArrival(input.expectedArrival, readPolicies(biz?.stay_policies));
    const result = await createStayBooking(db, businessId, input, todayIst(), 'desk');
    return NextResponse.json({ success: true, booking: { ...result.booking, category: { id: result.category.id, name: result.category.name, price: result.category.price } }, code: result.code, nights: result.nights }, { status: 201 });
  } catch (error) {
    if (error instanceof StayBookingError) {
      const status = { INVALID: 400, NOT_FOUND: 404, NO_AVAILABILITY: 409, FAILED: 500 }[error.code] || 500;
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status });
    }
    return handleApiError(error, request, 'HostStayBookingsPOST');
  }
}, 'HostStayBookingsPOST');

/** PATCH /api/host/accommodations/bookings { id, action: confirm | decline | cancel | no_show } */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId } = auth;
    const body = await request.json().catch(() => ({}));
    const status = ACTIONS[String(body?.action || '')];
    if (!status || typeof body?.id !== 'string') return NextResponse.json({ success: false, error: 'Choose a booking and an action.' }, { status: 400 });

    // A booking the guest has already paid for cannot just be cancelled: the money taken has to be returned, and that
    // is the owner's call (Void on the pass, behind the master PIN). Confirming it is harmless.
    if (status !== 'confirmed') {
      const { data: live } = await adminDb().from('stay_passes').select('id').eq('booking_id', body.id).eq('business_id', businessId).neq('status', 'void').maybeSingle();
      if (live) return NextResponse.json({ success: false, error: 'This stay has been paid. Cancel it with "Refund & cancel" so the payment is handled.', code: 'PAID' }, { status: 409 });
    }

    // A booking that already turned into a stay is history; it is not reopened from here.
    const { data, error } = await adminDb().from('stay_booking_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', body.id).eq('business_id', businessId).neq('status', 'checked_in').neq('status', 'checked_out')
      .select(SELECT).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ success: false, error: 'That booking was not found, or the guest has already checked in.' }, { status: 404 });
    return NextResponse.json({ success: true, booking: data });
  } catch (error) {
    return handleApiError(error, request, 'HostStayBookingsPATCH');
  }
}, 'HostStayBookingsPATCH');

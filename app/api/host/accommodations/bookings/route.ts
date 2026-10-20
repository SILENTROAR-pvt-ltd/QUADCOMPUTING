import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { todayIst } from '@/lib/services/reservations/venue-hours.service';

export const dynamic = 'force-dynamic';

const ACTIONS: Record<string, string> = { confirm: 'confirmed', decline: 'declined', cancel: 'cancelled', no_show: 'no_show' };
const SELECT = 'id, category_id, room_id, check_in, check_out, guests, guest_name, guest_phone, guest_email, note, status, confirmation_code, source, created_at, category:room_categories(id, name, price)';

/** GET /api/host/accommodations/bookings?scope=upcoming|all: the venue's advance bookings, soonest first. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;
    const scope = new URL(request.url).searchParams.get('scope') || 'upcoming';

    let q = supabase.from('stay_booking_requests').select(SELECT).eq('business_id', businessId);
    if (scope === 'upcoming') q = q.gte('check_out', todayIst()).in('status', ['requested', 'confirmed']);
    const { data, error } = await q.order('check_in', { ascending: true }).limit(200);
    if (error) throw error;
    return NextResponse.json({ success: true, bookings: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'HostStayBookingsGET');
  }
}, 'HostStayBookingsGET');

/** PATCH /api/host/accommodations/bookings { id, action: confirm | decline | cancel | no_show } */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;
    const body = await request.json().catch(() => ({}));
    const status = ACTIONS[String(body?.action || '')];
    if (!status || typeof body?.id !== 'string') return NextResponse.json({ success: false, error: 'Choose a booking and an action.' }, { status: 400 });

    // A booking that already turned into a stay is history; it is not reopened from here.
    const { data, error } = await supabase.from('stay_booking_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', body.id).eq('business_id', businessId).neq('status', 'checked_in')
      .select(SELECT).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ success: false, error: 'That booking was not found, or the guest has already checked in.' }, { status: 404 });
    return NextResponse.json({ success: true, booking: data });
  } catch (error) {
    return handleApiError(error, request, 'HostStayBookingsPATCH');
  }
}, 'HostStayBookingsPATCH');

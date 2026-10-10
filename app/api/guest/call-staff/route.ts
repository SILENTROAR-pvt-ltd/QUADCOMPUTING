import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryCafeId = searchParams.get('cafe_id') || searchParams.get('business_id');

    const body = await request.json();
    const { venue_id, business_id, table_number, type, message } = body;
    const rawVenueId = queryCafeId || venue_id || business_id;

    const validation = await validateGuestAccess(rawVenueId, table_number);
    if (validation.error) return validation.error;
    const { businessId, tableNumber } = validation;

    const limited = await enforceRateLimit(request, 'guest_call_staff', 60, 60_000, businessId);
    if (limited) return limited;

    // SERVICE = a guest asking for a venue service (spa, cab, laundry...) from the menu.
    const CALL_TYPES = ['WAITER', 'CHEF', 'BILL', 'SERVICE'];
    const callType = String(type || '').toUpperCase();
    if (!CALL_TYPES.includes(callType)) {
      return NextResponse.json({ success: false, error: 'Invalid request type' }, { status: 400 });
    }
    // Plain text only, short; it is shown to staff, never rendered as HTML.
    const cleanMessage = typeof message === 'string'
      ? message.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 140) || null
      : null;

    const supabase = adminDb();
    const { data, error } = await supabase
      .from('staff_notifications')
      .insert({
        business_id: businessId,
        table_number: tableNumber,
        notification_type: callType,
        message: cleanMessage,
        status: 'PENDING',
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('[API Call Staff] Notification not stored:', error.message);
      return NextResponse.json({ success: false, error: 'Could not alert staff. Please try again.' }, { status: 502 });
    }

    return NextResponse.json({ success: true, notification: data });
  } catch (err: any) {
    console.error('[API Call Staff] Error:', err);
    return NextResponse.json({ success: false, error: 'Could not alert staff. Please try again.' }, { status: 500 });
  }
}, 'GuestCallStaffPOST')

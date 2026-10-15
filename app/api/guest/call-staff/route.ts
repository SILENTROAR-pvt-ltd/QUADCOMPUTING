import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { cleanCallMessage, parseCallType, recordStaffCall } from '@/lib/services/guest/staff-call.service';

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
    const callType = parseCallType(type);
    if (!callType) {
      return NextResponse.json({ success: false, error: 'Invalid request type' }, { status: 400 });
    }

    const result = await recordStaffCall(adminDb(), { businessId, tableNumber, type: callType, message: cleanCallMessage(message) });
    if (!result.ok) {
      console.error('[API Call Staff] Notification not stored:', result.error);
      return NextResponse.json({ success: false, error: 'Could not alert staff. Please try again.' }, { status: 502 });
    }

    return NextResponse.json({ success: true, notification: result.notification, duplicate: result.duplicate });
  } catch (err: any) {
    console.error('[API Call Staff] Error:', err);
    return NextResponse.json({ success: false, error: 'Could not alert staff. Please try again.' }, { status: 500 });
  }
}, 'GuestCallStaffPOST')

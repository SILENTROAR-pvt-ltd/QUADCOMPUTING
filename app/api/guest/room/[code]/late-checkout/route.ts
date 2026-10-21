import { NextResponse } from 'next/server';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { recordStaffCall } from '@/lib/services/guest/staff-call.service';
import { isOccupied } from '@/lib/services/stay/room-access.service';
import { noStay, notVerified, roomContext } from '@/lib/services/stay/room-route.util';
import { findOption, policyFee, readPolicies } from '@/lib/services/stay/stay-policy';

export const dynamic = 'force-dynamic';

/**
 * POST /api/guest/room/[code]/late-checkout { option_id }
 * The guest asks to stay on past the check-out time. Nothing is charged or changed here: the request waits for the
 * desk, who approves it and takes the fee the way any room payment is taken (direct UPI, cash or card).
 */
export const POST = withApiErrorBoundary(async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const limited = await enforceRateLimit(request, 'room_late_checkout', 6, 10 * 60_000, code);
    if (limited) return limited;

    const ctx = await roomContext(request, code);
    if (!ctx.ok) return ctx.response;
    const { db, stay, verified } = ctx;
    if (!isOccupied(stay.room)) return noStay();
    if (!verified) return notVerified();

    const body = await request.json().catch(() => ({}));
    const option = findOption(readPolicies(stay.business.stay_policies), 'late_checkout', body?.option_id);
    if (!option) return NextResponse.json({ success: false, error: 'Choose one of the late check-out options.' }, { status: 400 });
    const fee = policyFee(option, Number(stay.room.category?.price) || 0);
    if (stay.room.late_checkout_request?.status === 'pending') {
      return NextResponse.json({ success: false, error: 'You already have a late check-out request waiting for the desk.', code: 'ALREADY_REQUESTED' }, { status: 409 });
    }

    // Written only while the stay is the same one the guest verified for, so a request cannot land on the next guest.
    const request_ = { status: 'pending', option_id: option.id, label: option.label, time: option.time, fee, requested_at: new Date().toISOString() };
    const { data, error } = await db.from('rooms').update({ late_checkout_request: request_ })
      .eq('id', stay.room.id).eq('business_id', stay.business.id).eq('status', 'OCCUPIED').select('id').maybeSingle();
    if (error) throw error;
    if (!data) return noStay();

    const call = await recordStaffCall(db, { businessId: stay.business.id, tableNumber: `ROOM ${stay.room.room_number}`, type: 'SERVICE', message: `Late check-out requested: ${option.label} (₹${fee.toLocaleString('en-IN')})` });
    if (!call.ok) console.error('[late checkout] the desk could not be notified', call.error);
    return NextResponse.json({ success: true, request: { status: 'pending', label: option.label, fee } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'GuestRoomLateCheckoutPOST');
  }
}, 'GuestRoomLateCheckoutPOST');

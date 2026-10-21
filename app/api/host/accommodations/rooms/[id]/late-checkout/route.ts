import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { declineLateCheckout, grantLateCheckout, planLateCheckout } from '@/lib/services/stay/late-checkout.service';
import { StayPassError } from '@/lib/services/stay/stay-pass.service';
import { readPolicies } from '@/lib/services/stay/stay-policy';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, number> = { INVALID: 400, NOT_FOUND: 404, CONFLICT: 409, FAILED: 500 };

/**
 * POST /api/host/accommodations/rooms/[id]/late-checkout
 * { action: 'grant', option_id?, payment_method, payment_reference? }  the guest asked (or the desk offers) and pays now
 * { action: 'decline' }                                                   the desk cannot extend this stay
 */
export const POST = withApiErrorBoundary(async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId } = auth;
    const { id: roomId } = await params;
    const body = await request.json().catch(() => ({}));
    const db = adminDb();

    if (body?.action === 'decline') {
      await declineLateCheckout(db, businessId, roomId);
      return NextResponse.json({ success: true });
    }
    if (body?.action !== 'grant' && body?.action !== 'preview') return NextResponse.json({ success: false, error: 'Choose an action.' }, { status: 400 });

    const { data: biz } = await db.from('businesses').select('stay_policies').eq('id', businessId).maybeSingle();
    if (body.action === 'preview') {
      const plan = await planLateCheckout(db, businessId, roomId, { optionId: body.option_id }, readPolicies(biz?.stay_policies));
      return NextResponse.json({ success: true, quote: { lines: [{ id: plan.line.id, name: plan.line.name, price: plan.line.price, qty: 1, notes: plan.line.notes }], amount: plan.fee }, until: plan.until, room_number: plan.room.room_number, guest_name: plan.room.guest_name || null, option_id: plan.option.id });
    }
    const out = await grantLateCheckout(db, businessId, roomId, { optionId: body.option_id, paymentMethod: body.payment_method, paymentReference: body.payment_reference }, readPolicies(biz?.stay_policies));
    return NextResponse.json({ success: true, ...out });
  } catch (error) {
    if (error instanceof StayPassError) return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: STATUS[error.code] || 500 });
    return handleApiError(error, request, 'HostLateCheckoutPOST');
  }
}, 'HostLateCheckoutPOST');

import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { adminDb } from '@/lib/supabase/admin';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { generateIdempotencyKey, withIdempotency } from '@/lib/services/api-idempotency.util';
import { quoteRoomPayment, recordRoomPayment } from '@/lib/services/stay/room-payment.service';
import { StayPassError } from '@/lib/services/stay/stay-pass.service';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, number> = { INVALID: 400, NOT_FOUND: 404, CONFLICT: 409, FAILED: 500 };

/**
 * POST /api/host/accommodations/rooms/[id]/payment
 * { action: 'preview' }                                                              what the guest owes now
 * { action: 'record', amount?, payment_method, payment_reference?, purpose?, idempotency_key? }  take it (all of it by default)
 */
export const POST = withApiErrorBoundary(async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId } = auth;
    const { id: roomId } = await params;
    const body = await request.json().catch(() => ({}));
    const db = adminDb();

    if (body?.action === 'preview') {
      const q = await quoteRoomPayment(db, businessId, roomId);
      return NextResponse.json({ success: true, quote: { lines: q.lines, amount: q.amount }, paid_so_far: q.paidSoFar, gross: q.gross, room_number: q.room.room_number, guest_name: q.room.guest_name || null });
    }
    if (body?.action !== 'record') return NextResponse.json({ success: false, error: 'Choose an action.' }, { status: 400 });

    // One key per sheet: a double tap records one payment.
    const key = generateIdempotencyKey('room_payment', `${businessId}:${roomId}`, { idempotency_key: body.idempotency_key || `${body.amount}:${body.payment_method}:${body.payment_reference || ''}` });
    const { response, status } = await withIdempotency(key, async () => {
      const out = await recordRoomPayment(db, businessId, roomId, { amount: body.amount, paymentMethod: body.payment_method, paymentReference: body.payment_reference, purpose: body.purpose });
      return { response: { success: true, ...out }, status: 200 };
    });
    return NextResponse.json(response, { status });
  } catch (error) {
    if (error instanceof StayPassError) return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: STATUS[error.code] || 500 });
    return handleApiError(error, request, 'HostRoomPaymentPOST');
  }
}, 'HostRoomPaymentPOST');

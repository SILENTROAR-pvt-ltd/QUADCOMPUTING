import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/auth/guards';
import { withIdempotency } from '@/lib/services/api-idempotency.util';
import { recordRoomPayment } from '@/lib/services/stay/room-payment.service';
import { StayPassError } from '@/lib/services/stay/stay-pass.service';

// A room bill from the till does one of two things, chosen on the receipt (settlement.mode):
//  'payment'  the money is adjusted in the running stay: a settled room_advance bill and the room's advance raised, so
//             the guest's page and the desk's folio show it paid and only the rest is owed at checkout. The guest
//             stays checked in. This is the default: a part payment must never check a guest out.
//  'checkout' the guest's checkout: the room checkout route writes the stay invoice, settles the room-service orders,
//             credits the guest's cashback, frees the room and marks the booking stayed.

const TENDERS = ['UPI', 'CASH', 'CARD'];
const STATUS: Record<string, number> = { INVALID: 400, NOT_FOUND: 404, CONFLICT: 409, FAILED: 500 };

export function roomSettleMode(settlement: any): 'payment' | 'checkout' {
  return settlement?.mode === 'checkout' ? 'checkout' : 'payment';
}

/** Adjusts a payment in the stay. Idempotent on the receipt's bill id, so a retried save takes the money once. */
export async function adjustRoomFromTill(businessId: string, roomId: string, body: any): Promise<NextResponse> {
  const asked = Number(body?.settlement?.amount);
  const amount = Number.isFinite(asked) && asked > 0 ? asked : Number(body?.grandTotal) || 0;
  try {
    const { response, status } = await withIdempotency(`room_till_payment:${businessId}:${roomId}:${body?.id || amount}`, async () => {
      const out = await recordRoomPayment(adminDb(), businessId, roomId, { amount, paymentMethod: body?.paymentMethod, paymentReference: body?.settlement?.payment_reference, purpose: 'balance', source: 'till' });
      return { response: { success: true, settled: true, order: { id: out.billId }, payment: { amount: out.amount, balance: out.balance, paidSoFar: out.paidSoFar, roomNumber: out.roomNumber, guestName: out.guestName } }, status: 200 };
    });
    return NextResponse.json(response, { status });
  } catch (error) {
    if (error instanceof StayPassError) return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: STATUS[error.code] || 500 });
    throw error;
  }
}

/** Settles the whole stay through the checkout route and reports its invoice as the till's saved bill. */
export async function settleRoomFromTill(request: Request, roomId: string, paymentMethod: unknown): Promise<NextResponse> {
  const tender = String(paymentMethod || '').toUpperCase();
  if (!TENDERS.includes(tender)) return NextResponse.json({ success: false, error: 'Choose how the guest paid: UPI, cash or card.' }, { status: 400 });
  const { POST: checkout } = await import('@/app/api/host/accommodations/rooms/[id]/checkout/route');
  const forwarded = new Request(new URL(`/api/host/accommodations/rooms/${encodeURIComponent(roomId)}/checkout`, request.url), {
    method: 'POST', headers: request.headers, body: JSON.stringify({ payment_method: tender }),
  });
  const res = await checkout(forwarded, { params: Promise.resolve({ id: roomId }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    return NextResponse.json({ success: false, error: data?.error || 'The room could not be checked out.', code: data?.code }, { status: res.status || 500 });
  }
  return NextResponse.json({
    success: true, order: { id: data.order_id, ...(data.invoice || {}) }, settled: true,
    room: data.room || null, checkoutSummary: data.checkoutSummary || null, warnings: data.warnings || [],
  });
}

import { NextResponse } from 'next/server';

// A room's bill settled from the till IS the guest's checkout: it goes through the room checkout route, which writes
// the stay invoice, settles the room-service orders, credits the guest's cashback, frees the room and marks the booking
// stayed. The table settlement knows none of that, and used to leave the stay open with a stray order beside it.

const TENDERS = ['UPI', 'CASH', 'CARD'];

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

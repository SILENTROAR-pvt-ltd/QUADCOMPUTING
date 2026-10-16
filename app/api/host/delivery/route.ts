import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { listDeliveryOrders, updateDeliveryOrder } from '@/lib/services/delivery/delivery-orders.service';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/host/delivery: the venue's delivery orders from the last day, for the delivery board. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  const orders = await listDeliveryOrders(adminDb(), auth.business.id);
  return NextResponse.json({ success: true, orders }, { headers: noStore });
}, 'HostDeliveryGET');

/** PATCH /api/host/delivery: body { order_id, status? , paid? }. Moves a delivery a stage on, or confirms advance UPI. */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => ({}));
  const orderId = String(body.order_id ?? '');
  if (!UUID.test(orderId)) return NextResponse.json({ error: 'Invalid delivery update.' }, { status: 400 });

  const result = await updateDeliveryOrder(adminDb(), auth.business.id, orderId, { status: body.status, paid: body.paid });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ success: true, order: result.order });
}, 'HostDeliveryPATCH');

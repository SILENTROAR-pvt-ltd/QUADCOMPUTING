import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { parseLines, parseNewOrder } from '@/lib/services/inventory/purchase-input';
import { cancelOrder, createOrder, listPurchasing, receiveOrder, recordPurchaseNow } from '@/lib/services/inventory/purchase-order.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (r: { status: number; error: string }) => NextResponse.json({ error: r.error }, { status: r.status });

/** Vendors and recent purchase orders, plus the venue name used in order messages. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const r = await listPurchasing(auth.supabase, auth.businessId);
    if (!r.ok) return fail(r);
    const venue_name = auth.business?.business_name || auth.business?.name || 'our venue';
    return NextResponse.json({ ...r.value, venue_name }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, request, 'HostPurchaseOrdersGET');
  }
}, 'HostPurchaseOrdersGET');

/** Saves an order that was sent to a vendor. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    const parsed = parseNewOrder(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    // `receive_now`: the goods are already here, so the order is saved and booked into stock in one step.
    const receiveNow = body?.receive_now === true;
    const r = receiveNow
      ? await recordPurchaseNow(auth.supabase, auth.businessId, parsed.value)
      : await createOrder(auth.supabase, auth.businessId, parsed.value);
    return r.ok ? NextResponse.json(receiveNow ? r.value : { order: r.value }) : fail(r);
  } catch (error) {
    return handleApiError(error, request, 'HostPurchaseOrdersPOST');
  }
}, 'HostPurchaseOrdersPOST');

/** `action: "receive"` books the delivery into stock; `action: "cancel"` closes an open order. */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    if (!UUID.test(String(body.id || ''))) return NextResponse.json({ error: 'Missing order id.' }, { status: 400 });

    if (body.action === 'cancel') {
      const r = await cancelOrder(auth.supabase, auth.businessId, body.id);
      return r.ok ? NextResponse.json({ order: r.value }) : fail(r);
    }
    if (body.action === 'receive') {
      const lines = parseLines(body.lines, true);
      if (!lines.ok) return NextResponse.json({ error: lines.error }, { status: 400 });
      const r = await receiveOrder(auth.supabase, auth.businessId, body.id, lines.value);
      return r.ok ? NextResponse.json(r.value) : fail(r);
    }
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    return handleApiError(error, request, 'HostPurchaseOrdersPATCH');
  }
}, 'HostPurchaseOrdersPATCH');

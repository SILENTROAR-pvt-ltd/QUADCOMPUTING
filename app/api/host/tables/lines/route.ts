import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { editPendingLine, voidPendingLine } from '@/lib/services/session/void-line.service';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_STORE = { 'Cache-Control': 'no-store' };

function lineIdOf(body: any): string | null {
  return typeof body?.order_item_id === 'string' && UUID_REGEX.test(body.order_item_id) ? body.order_item_id : null;
}

/** POST /api/host/tables/lines  { order_item_id } — removes a line that the kitchen has not started. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const lineId = lineIdOf(await request.json().catch(() => ({})));
    if (!lineId) return NextResponse.json({ success: false, error: 'Choose an item to remove.' }, { status: 400, headers: NO_STORE });

    const staffId = auth.user?.id && UUID_REGEX.test(auth.user.id) ? auth.user.id : null;
    const result = await voidPendingLine(adminDb(), auth.businessId, lineId, staffId);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status, headers: NO_STORE });
    return NextResponse.json({ success: true, ...result.value }, { headers: NO_STORE });
  } catch (error: any) {
    return handleApiError(error, request, 'HostTableLinesPOST');
  }
}, 'HostTableLinesPOST');

/** PATCH /api/host/tables/lines  { order_item_id, quantity } — changes how many of a line the kitchen has not started. */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    const lineId = lineIdOf(body);
    const quantity = Number(body?.quantity);
    if (!lineId || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      return NextResponse.json({ success: false, error: 'Choose an item and a quantity from 1 to 50.' }, { status: 400, headers: NO_STORE });
    }

    const staffId = auth.user?.id && UUID_REGEX.test(auth.user.id) ? auth.user.id : null;
    const result = await editPendingLine(adminDb(), auth.businessId, lineId, quantity, staffId);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status, headers: NO_STORE });
    return NextResponse.json({ success: true, ...result.value }, { headers: NO_STORE });
  } catch (error: any) {
    return handleApiError(error, request, 'HostTableLinesPATCH');
  }
}, 'HostTableLinesPATCH');

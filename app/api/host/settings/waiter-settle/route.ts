import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { readWaiterCanSettle, writeWaiterCanSettle } from '@/lib/services/venue/waiter-settle-setting';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'no-store' };

/** GET /api/host/settings/waiter-settle  → { enabled } : whether waiters may settle bills from Live Tables. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const enabled = await readWaiterCanSettle(adminDb(), auth.businessId);
    return NextResponse.json({ success: true, enabled }, { headers: NO_STORE });
  } catch (error: any) {
    return handleApiError(error, request, 'HostWaiterSettleGET');
  }
}, 'HostWaiterSettleGET');

/** PUT /api/host/settings/waiter-settle  { enabled: boolean } — the owner's switch. */
export const PUT = withApiErrorBoundary(async function PUT(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    if (typeof body?.enabled !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Choose on or off.' }, { status: 400, headers: NO_STORE });
    }
    const out = await writeWaiterCanSettle(adminDb(), auth.businessId, body.enabled);
    if (!out.ok) {
      return NextResponse.json({ success: false, code: out.code, error: out.error }, { status: out.code === 'NOT_READY' ? 409 : 500, headers: NO_STORE });
    }
    return NextResponse.json({ success: true, enabled: body.enabled }, { headers: NO_STORE });
  } catch (error: any) {
    return handleApiError(error, request, 'HostWaiterSettlePUT');
  }
}, 'HostWaiterSettlePUT');

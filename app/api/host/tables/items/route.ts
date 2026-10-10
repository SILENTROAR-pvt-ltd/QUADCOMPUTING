import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { cleanTableItems } from '@/lib/services/session/table-items-input';
import { addItemsToTable } from '@/lib/services/session/table-items.service';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

/** POST /api/host/tables/items  { table_number, items: [{ item_id, quantity, notes }] } — a waiter adds catalogue items to a table. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;

    const limited = await enforceRateLimit(request, 'host_table_items', 60, 60_000, auth.businessId);
    if (limited) return limited;

    const checked = cleanTableItems(await request.json().catch(() => ({})));
    if (!checked.ok) return NextResponse.json({ success: false, error: checked.error }, { status: 400, headers: NO_STORE });

    const result = await addItemsToTable(adminDb(), auth.businessId, checked.value);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status, headers: NO_STORE });
    return NextResponse.json({ success: true, ...result.value }, { status: 201, headers: NO_STORE });
  } catch (error: any) {
    return handleApiError(error, request, 'HostTableItemsPOST');
  }
}, 'HostTableItemsPOST');

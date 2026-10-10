import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { listMovements } from '@/lib/services/inventory/overview.service';
import { parseMovement } from '@/lib/services/inventory/movement-input';
import { recordMovement } from '@/lib/services/inventory/movement.service';

/** The stock ledger: purchases, use by sold dishes, wastage, adjustments and counts. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const p = new URL(request.url).searchParams;
    const movements = await listMovements(auth.supabase, auth.businessId, {
      itemId: p.get('item_id'), type: p.get('type'), limit: Number(p.get('limit')) || 200,
    });
    return NextResponse.json({ movements }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    if (error?.code === '42703') {
      return NextResponse.json({ error: 'The stock ledger needs the latest database update (migration 20261010000007).' }, { status: 503 });
    }
    return handleApiError(error, request, 'HostInventoryMovementsGET');
  }
}, 'HostInventoryMovementsGET');

/** Records a purchase, wastage, adjustment or physical count for one item. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const parsed = parseMovement(await request.json().catch(() => ({})));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    if (parsed.value.type === 'OPENING') {
      return NextResponse.json({ error: 'Opening stock is set when the item is added. Record a purchase instead.' }, { status: 400 });
    }
    const result = await recordMovement(auth.supabase, auth.businessId, parsed.value);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, ...result.value });
  } catch (error) {
    return handleApiError(error, request, 'HostInventoryMovementsPOST');
  }
}, 'HostInventoryMovementsPOST');

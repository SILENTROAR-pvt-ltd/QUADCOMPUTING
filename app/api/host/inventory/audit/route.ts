import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { recordMovement } from '@/lib/services/inventory/movement.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A physical stock count. The variance is worked out by the database against the stock at the
 * moment of saving (not the figure the screen loaded), so sales made during the count still count.
 */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { audits, notes } = await request.json().catch(() => ({}));
    if (!Array.isArray(audits) || audits.length === 0) {
      return NextResponse.json({ error: 'Enter at least one counted quantity.' }, { status: 400 });
    }

    const counts = audits
      .map((a: any) => ({ id: String(a?.raw_item_id || ''), qty: Number(a?.physical_stock) }))
      .filter((a) => UUID.test(a.id) && Number.isFinite(a.qty) && a.qty >= 0);
    if (counts.length === 0) return NextResponse.json({ error: 'The counted quantities are not valid.' }, { status: 400 });

    const results = [];
    for (const c of counts) {
      const r = await recordMovement(auth.supabase, auth.businessId, {
        item_id: c.id, type: 'COUNT', quantity: c.qty, unit_cost: null, supplier: null, reference: null,
        notes: typeof notes === 'string' && notes.trim() ? notes.trim().slice(0, 240) : 'Stock count',
      });
      if (!r.ok && r.status === 503) return NextResponse.json({ error: r.error }, { status: 503 });
      results.push(r.ok ? { item_id: c.id, variance: r.value.change, stock_after: r.value.stock_after } : { item_id: c.id, error: r.error });
    }

    const failed = results.filter((r: any) => r.error).length;
    return NextResponse.json({
      success: failed === 0,
      counted: results.length - failed,
      failed,
      results,
      message: failed ? `${failed} item(s) could not be saved.` : 'Count saved and stock updated.',
    }, { status: failed === results.length ? 500 : 200 });
  } catch (error) {
    return handleApiError(error, request, 'HostInventoryAuditPOST');
  }
}, 'HostInventoryAuditPOST');

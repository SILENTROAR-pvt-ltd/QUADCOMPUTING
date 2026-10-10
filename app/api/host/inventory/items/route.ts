import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { getInventoryOverview } from '@/lib/services/inventory/overview.service';
import { createItems, parseItemPatch } from '@/lib/services/inventory/item-crud.service';

const noStore = { headers: { 'Cache-Control': 'no-store' } };

/** Stock items with status, use, cover and value, and the venue's inventory totals. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const overview = await getInventoryOverview(auth.supabase, auth.businessId);
    return NextResponse.json(overview, noStore);
  } catch (error) {
    return handleApiError(error, request, 'HostInventoryItemsGET');
  }
}, 'HostInventoryItemsGET');

/** Adds one item or a batch; opening stock is recorded as a ledger movement. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    const list = Array.isArray(body.items) ? body.items : body.itemName || body.item_name ? [body] : [];
    if (list.length === 0) return NextResponse.json({ error: 'Add at least one item.' }, { status: 400 });
    if (list.length > 200) return NextResponse.json({ error: 'Add up to 200 items at a time.' }, { status: 400 });

    const result = await createItems(auth.supabase, auth.businessId, list);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({
      success: true, count: result.items.length, item: result.items[0] || null, items: result.items,
      ...(result.warnings.length ? { warnings: result.warnings } : {}),
    });
  } catch (error) {
    return handleApiError(error, request, 'HostInventoryItemsPOST');
  }
}, 'HostInventoryItemsPOST');

/** Edits an item's details (name, unit, reorder level, supplier). Stock moves only through movements. */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => ({}));
    if (!body.id) return NextResponse.json({ error: 'Missing item id.' }, { status: 400 });
    const updates = parseItemPatch(body);
    if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 });

    const { data, error } = await auth.supabase.from('raw_inventory_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', body.id).eq('business_id', auth.businessId).select().maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'That stock item no longer exists.' }, { status: 404 });
    return NextResponse.json({ item: data });
  } catch (error) {
    return handleApiError(error, request, 'HostInventoryItemsPATCH');
  }
}, 'HostInventoryItemsPATCH');

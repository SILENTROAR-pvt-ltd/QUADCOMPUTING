import { masterUnlockRequired } from '@/lib/services/security/master-unlock-guard';
import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const locked = masterUnlockRequired(request, auth);
    if (locked) return locked;
    const { businessId, supabase } = auth;

    const { locationIds, category, mode, value } = await request.json();

    if (!locationIds || !Array.isArray(locationIds) || locationIds.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid locationIds' }, { status: 400 });
    }

    if (!['percentage', 'flat'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return NextResponse.json({ error: 'Invalid value' }, { status: 400 });
    }
    // Guard against fat-finger bulk changes that would wipe or explode every price.
    if (mode === 'percentage' && (value < -90 || value > 500)) {
      return NextResponse.json({ error: 'Percentage must be between -90 and 500' }, { status: 400 });
    }
    if (mode === 'flat' && Math.abs(value) > 100000) {
      return NextResponse.json({ error: 'Flat change must be within ±100000' }, { status: 400 });
    }

    const dbCategory = category === 'food_beverage' ? 'food' : (category === 'accommodation' ? 'room' : category);

    // Verify the locationIds belong to this business
    const { data: validLocations } = await supabase
      .from('locations')
      .select('id')
      .eq('business_id', businessId)
      .in('id', locationIds);

    const validLocationIds = validLocations?.map((l: any) => l.id) || [];
    if (validLocationIds.length === 0) {
      return NextResponse.json({ error: 'No valid locations found for this host' }, { status: 403 });
    }

    let query = supabase
      .from('catalog_items')
      .select('id, price')
      .eq('business_id', businessId)
      .in('location_id', validLocationIds)
      .eq('is_available', true);

    if (dbCategory !== 'All') {
      query = query.eq('item_type', dbCategory);
    }

    const { data: items, error: selectError } = await query;
    if (selectError) {
      throw selectError;
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const updates = items.map((item: any) => {
      let newPrice = item.price;
      if (mode === 'percentage') {
        newPrice = item.price * (1 + value / 100);
      } else if (mode === 'flat') {
        newPrice = item.price + value;
      }
      newPrice = Math.max(0, Math.round(newPrice * 100) / 100);

      return {
        id: item.id,
        price: newPrice
      };
    });

    const CHUNK_SIZE = 50;
    let failed = 0;
    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);
      const results = await Promise.all(
        chunk.map((u: any) =>
          supabase
            .from('catalog_items')
            .update({ price: u.price })
            .eq('id', u.id)
            .eq('business_id', businessId)
        )
      );
      failed += results.filter((r: any) => r?.error).length;
    }

    if (failed > 0) {
      console.error('[Bulk Price Update] partial failure', { businessId, failed, total: updates.length });
      return NextResponse.json(
        { success: false, error: `${failed} of ${updates.length} price updates failed. Reload to see current prices and retry.`, updated: updates.length - failed, failed },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, count: updates.length });
  } catch (error: any) {
    console.error('[Bulk Price Update API Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, 'HostCatalogBulkPriceUpdatePOST');

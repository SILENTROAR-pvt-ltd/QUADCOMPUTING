import { safeMessage } from '@/lib/utils/safe-message';
import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;

    const { items } = await request.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No valid items provided for insertion.' }, { status: 400 });
    }

    const { data: locations } = await supabase
      .from('locations')
      .select('id')
      .eq('business_id', businessId)
      .limit(1);

    const locationId = locations && locations.length > 0 ? locations[0].id : null;

    const catalogPayload = items.map((item: any) => ({
      business_id: businessId,
      location_id: locationId,
      item_type: item.item_type || 'food',
      name: item.name,
      description: item.description || '',
      price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
      category: item.category,
      image_url: item.image_url || item.imageUrl || null,
      is_available: true,
      metadata: item.metadata || null
    }));

    const { data: insertedItems, error: catalogError } = await supabase
      .from('catalog_items')
      .insert(catalogPayload)
      .select('id');

    if (catalogError) {
      console.error('Catalog Insert Error:', catalogError);
      return NextResponse.json({ error: catalogError.message }, { status: 400 });
    }

    if (insertedItems && insertedItems.length > 0) {
      const inventoryPayload = insertedItems.map((record: any, index: number) => {
        const correspondingItem = items[index];
        return {
          catalog_item_id: record.id,
          stock_quantity: correspondingItem.stock ? parseInt(correspondingItem.stock, 10) : 0,
          low_stock_threshold: 5
        };
      });

      const { error: inventoryError } = await supabase
        .from('inventory_stock')
        .insert(inventoryPayload);

      if (inventoryError) {
        console.error('Inventory Insert Error:', inventoryError);
      }
    }

    try {
      const { checkFreeTier, logFreeTierUsage, isFreeItemType } = await import('@/lib/services/wallet/free-tier.service');
      const { evaluateFeeGuard, generateInvoiceRef } = await import('@/lib/services/wallet/fee-guard.service');

      const standardMenuItems = (items || []).filter((it: any) => !isFreeItemType(it.item_type, it.category));
      const totalBatch = standardMenuItems.length;

      if (totalBatch > 0) {
        const tierCheck = await checkFreeTier(supabase, businessId, 'menu');
        const beforeCount = Math.max(0, tierCheck.existingCount - totalBatch);
        const freeSlots = Math.max(0, tierCheck.threshold - beforeCount);
        const freeCount = Math.min(totalBatch, freeSlots);
        const chargedCount = totalBatch - freeCount;

        const bulkRef = generateInvoiceRef();

        if (freeCount > 0) {
          await logFreeTierUsage(supabase, businessId, 'menu_item_creation', `${bulkRef}-FREE(${freeCount})`);
        }

        if (chargedCount > 0) {
          const totalFee = chargedCount * tierCheck.cost;
          await evaluateFeeGuard(businessId, 'menu_item_creation', bulkRef, supabase, totalFee);
        }
      }
    } catch (guardErr) {
      console.error('[Bulk Ingest FeeGuard Error]', guardErr);
    }

    return NextResponse.json({ success: true, count: insertedItems?.length || 0 });
  } catch (error: any) {
    console.error('Bulk Ingest Error:', error);
    return NextResponse.json({ error: safeMessage(error, 'Internal Server Error') }, { status: 500 });
  }
}, 'HostCatalogBulkInsertPOST');

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { resolveBusinessId } from '@/lib/services/guest-order/business-resolver.service';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';

// item_options exists in two shapes in deployed databases: the original
// (catalog_item_id, option_name, additional_price) and the later one
// (item_id, business_id, name, price, is_available), because a later
// "CREATE TABLE IF NOT EXISTS" never altered an existing table. Scope by the
// venue's own item ids (works for both) and normalize the row shape.
async function loadItemOptions(supabase: any, itemIds: string[]) {
  if (itemIds.length === 0) return [];
  for (const fk of ['item_id', 'catalog_item_id']) {
    const { data, error } = await supabase.from('item_options').select('*').in(fk, itemIds);
    if (error) {
      if (error.code === '42703') continue; // this schema doesn't have that column; try the other
      if (error.code !== '42P01') console.error('[GuestCatalog] item_options read failed (non-fatal):', error.message);
      return [];
    }
    return (data || [])
      .map((o: any) => ({
        id: o.id,
        item_id: o.item_id ?? o.catalog_item_id,
        name: o.name ?? o.option_name ?? '',
        group: o.option_group_name ?? null,
        price: Number(o.price ?? o.additional_price ?? 0),
        is_available: o.is_available ?? true,
      }))
      .filter((o: any) => o.is_available && o.name);
  }
  return [];
}

export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawCafeId =
      searchParams.get('cafe_id') ||
      searchParams.get('business_id') ||
      searchParams.get('cafeId') ||
      searchParams.get('businessId') ||
      searchParams.get('venue') ||
      searchParams.get('slug') ||
      request.headers.get('x-cafe-id') ||
      request.headers.get('x-business-id');

    // 1. Resolve cafe identifier (UUID or slug) to verified businesses.id
    const resolved = await resolveBusinessId(rawCafeId);
    if (!resolved.success) {
      return resolved.error;
    }

    const { businessId, business } = resolved;
    const supabase = adminDb();

    // 2. Query catalog_items filtered strictly by resolved business_id where is_available = true
    const { data: catalogItems, error: itemsError } = await supabase
      .from('catalog_items')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_available', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // 3. Options for this venue's items. Optional data: a failure here must never
    // take the whole menu down, so errors degrade to "no options".
    const itemOptions = await loadItemOptions(supabase, (catalogItems || []).map((i: any) => i.id));

    // 4. Return successful 200 response with menu catalog items JSON
    return NextResponse.json({
      success: true,
      business_id: businessId,
      venue: {
        id: businessId,
        name: business.business_name || business.name || 'Venue',
        slug: business.slug,
        categories: business.categories || [],
      },
      items: catalogItems || [],
      options: itemOptions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error fetching catalog' },
      { status: 500 }
    );
  }
}, 'GuestCatalogGET')

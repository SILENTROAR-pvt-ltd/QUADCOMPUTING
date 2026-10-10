import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';

export const POST = withApiErrorBoundary(async function POST(req: Request) {
  try {
    const auth = await requireHost(req);
    if (auth.error) return auth.error;
    const { user, businessId, supabase } = auth;

    const body = await req.json();
    // The food form sends itemType/imageUrl; other screens send item_type/image_url. Both are accepted:
    // reading only the snake_case names silently dropped every image change made from the food form.
    const item_type = body.item_type ?? body.itemType;
    const image_url = body.image_url !== undefined ? body.image_url : body.imageUrl;
    const {
      id,
      name,
      category,
      price,
      description,
      dietType,
      prepTimeMinutes,
      duration,
      providerType,
      inventoryCount,
      metadata: extraMetadata
    } = body;

    if (!id || !name || price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify ownership indirectly by checking if the user owns the business associated with this item
    const { data: catalogItem } = await supabase
      .from('catalog_items')
      .select('business_id, metadata, name, category')
      .eq('id', id)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!catalogItem) {
      const roomCategoryId = extraMetadata?.room_category_id;
      if (extraMetadata?.source !== 'room_category_addon' || !roomCategoryId) {
        return NextResponse.json({ error: 'Catalog item not found' }, { status: 404 });
      }

      const { data: roomCategory } = await supabase.from('room_categories')
        .select('id, business_id, addons, available_addons')
        .eq('id', roomCategoryId)
        .eq('business_id', businessId)
        .maybeSingle();
      if (!roomCategory) return NextResponse.json({ error: 'Room add-on not found' }, { status: 404 });

      const field = Array.isArray(roomCategory.addons) && roomCategory.addons.length ? 'addons' : 'available_addons';
      const addons = Array.isArray(roomCategory[field]) ? [...roomCategory[field]] : [];
      const addonIndex = addons.findIndex((addon: any) =>
        String(addon.id || '') === String(id) || String(addon.name || '').trim().toLowerCase() === String(name).trim().toLowerCase()
      );
      if (addonIndex < 0) return NextResponse.json({ error: 'Room add-on not found' }, { status: 404 });
      addons[addonIndex] = { ...addons[addonIndex], price: Number(price) };
      const { error: addonUpdateError } = await supabase.from('room_categories')
        .update({ [field]: addons }).eq('id', roomCategory.id).eq('business_id', businessId);
      if (addonUpdateError) throw addonUpdateError;
      return NextResponse.json({ success: true, data: addons[addonIndex] });
    }

    let updatedMetadata: Record<string, any> = {
      ...(catalogItem.metadata || {}),
      ...(extraMetadata || {}),
    };

    if (item_type === 'food') {
      updatedMetadata = {
        ...updatedMetadata,
        dietary: dietType || updatedMetadata.dietary || 'veg',
        prep_time_minutes: prepTimeMinutes ? parseInt(prepTimeMinutes, 10) : updatedMetadata.prep_time_minutes,
        is_recipe_ready: true,
      };
    } else if (item_type === 'service') {
      updatedMetadata = {
        ...updatedMetadata,
        duration: duration || updatedMetadata.duration || null,
        provider_type: providerType || updatedMetadata.provider_type || 'in_house',
      };
    }

    const { data: updatedItem, error: updateError } = await supabase
      .from('catalog_items')
      .update({
        name: name ? String(name).trim() : catalogItem.name,
        item_type,
        category: category ? String(category).trim() : catalogItem.category,
        price,
        description,
        image_url,
        metadata: updatedMetadata,
      })
      .eq('id', id)
      .eq('business_id', businessId)
      .select()
      .single();

    if (updateError) {
      console.error('[Catalog Update Error]', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Sync inventory if provided
    if (inventoryCount !== undefined && inventoryCount !== null) {
      await supabase
        .from('inventory_stock')
        .upsert({
          catalog_item_id: id,
          stock_quantity: parseInt(inventoryCount, 10) || 0,
          low_stock_threshold: 5,
        }, { onConflict: 'catalog_item_id' });
    }

    // Bidirectional sync: if this catalog item is linked to a room_category, sync price, name & image
    if (item_type === 'room' || category === 'Accommodations' || category === 'accommodation') {
      await supabase
        .from('room_categories')
        .update({
          name,
          price: parseFloat(price),
          ...(image_url ? { photos: [image_url] } : {})
        })
        .eq('catalog_item_id', id)
        .eq('business_id', businessId);
    }

    return NextResponse.json({ success: true, data: updatedItem });
  } catch (err: any) {
    console.error('[Catalog Update Route Exception]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, 'HostCatalogUpdatePOST');

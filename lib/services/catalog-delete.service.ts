import { deleteRoomCategoryAddon } from './catalog-delete-addon.service';

export async function executeCatalogDelete(
  request: Request,
  supabase: any,
  authorizedBizId?: string
) {
  let itemId = '';
  let catalogItemId = '';
  let itemName = '';
  let itemMetadata: Record<string, any> = {};

  if (request.method === 'DELETE') {
    itemId = new URL(request.url).searchParams.get('id') || '';
  }
  if (!itemId) {
    const body = await request.json().catch(() => ({}));
    itemId = body.id || '';
    catalogItemId = body.catalog_item_id || '';
    itemName = body.name || '';
    itemMetadata = body.metadata || {};
  }

  const targetId = itemId || catalogItemId;
  if (!targetId && !itemName) throw new Error('Missing item id or name to delete');

  let businessId = authorizedBizId || '';
  if (!businessId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      const { data: b } = await supabase
        .from('businesses')
        .select('id')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (b?.id) businessId = b.id;
    }
  }

  if (!businessId) {
    throw new Error('Business ID is required to execute catalog deletion');
  }

  // 1. Try deleting room category add-on (e.g. Breakfast CP)
  const isAddon =
    itemMetadata.source === 'room_category_addon' ||
    targetId.startsWith('addon_') ||
    itemName.includes('(CP)');
  const addonDeleted = await deleteRoomCategoryAddon(
    supabase,
    businessId,
    targetId,
    itemName,
    itemMetadata.room_category_id
  );
  if (isAddon && addonDeleted) {
    return {
      success: true,
      message: 'Room add-on deleted successfully',
      deleted_id: targetId,
    };
  }

  // 2. Cascade delete dependent recipes & inventory.
  // NOTE: there is no `menu_items` table in this schema — catalog_items is the
  // single source of truth for catalog entries (previously this also issued a
  // delete against a nonexistent `menu_items` table, silently swallowed below).
  if (targetId) {
    const { error: recipeErr } = await supabase.from('recipe_ingredients').delete().eq('catalog_item_id', targetId);
    if (recipeErr) throw recipeErr;
    const { error: stockErr } = await supabase.from('inventory_stock').delete().eq('catalog_item_id', targetId);
    if (stockErr) throw stockErr;
  }

  // 3. Delete from catalog_items (hard delete with soft fallback)
  const { error: err } = await supabase
    .from('catalog_items')
    .delete()
    .eq('id', targetId)
    .eq('business_id', businessId);
  if (err && targetId) {
    await supabase
      .from('catalog_items')
      .update({
        is_available: false,
        metadata: {
          deleted: true,
          archived: true,
          deleted_at: new Date().toISOString(),
        },
      })
      .eq('id', targetId)
      .eq('business_id', businessId);
  }

  return {
    success: true,
    message: 'Item deleted from catalog',
    deleted_id: targetId,
  };
}

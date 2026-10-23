const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function httpError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

export async function deleteCatalogItem(itemId: string, supabase: any, businessId: string) {
  // itemId is interpolated into a PostgREST .or() filter below; anything but a UUID could inject extra filters.
  if (!UUID_REGEX.test(itemId)) throw httpError('Invalid item id', 400);
  // Always the caller's own venue: without one there is no owner to check against, so nothing is deleted.
  if (!businessId) throw httpError('Venue required', 400);

  const [{ data: ownedItem }, { data: ownedCategory }] = await Promise.all([
    supabase.from('catalog_items').select('id').eq('id', itemId).eq('business_id', businessId).maybeSingle(),
    supabase.from('room_categories').select('id').or(`catalog_item_id.eq.${itemId},id.eq.${itemId}`).eq('business_id', businessId).limit(1).maybeSingle(),
  ]);
  if (!ownedItem && !ownedCategory) throw httpError('Catalog item not found', 404);

  try { await supabase.from('recipe_ingredients').delete().eq('catalog_item_id', itemId); } catch {}
  try { await supabase.from('inventory_stock').delete().eq('catalog_item_id', itemId); } catch {}
  try {
    await supabase.from('room_categories').delete().or(`catalog_item_id.eq.${itemId},id.eq.${itemId}`).eq('business_id', businessId);
  } catch {}

  const { error: delError } = await supabase.from('catalog_items').delete().eq('id', itemId).eq('business_id', businessId);
  if (delError) {
    await supabase.from('catalog_items').update({
      is_available: false,
      metadata: { deleted: true, archived: true, deleted_at: new Date().toISOString() },
    }).eq('id', itemId).eq('business_id', businessId);
  }

  return { success: true, deleted_id: itemId };
}

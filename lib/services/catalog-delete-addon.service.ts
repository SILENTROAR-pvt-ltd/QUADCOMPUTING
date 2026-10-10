/**
 * Deletes room category add-ons like 'Breakfast (CP)' from room_categories.
 */
export async function deleteRoomCategoryAddon(
  supabase: any,
  businessId: string,
  targetId: string,
  targetName: string,
  roomCategoryId?: string
): Promise<boolean> {
  let query = supabase.from('room_categories').select('id, business_id, addons, available_addons');
  if (roomCategoryId) {
    query = query.eq('id', roomCategoryId);
  } else if (businessId) {
    query = query.eq('business_id', businessId);
  }

  const { data: categories, error } = await query;
  if (error || !categories || categories.length === 0) return false;

  let anyDeleted = false;
  for (const rc of categories) {
    const field = Array.isArray(rc.addons) && rc.addons.length ? 'addons' : 'available_addons';
    const addons: any[] = Array.isArray(rc[field]) ? rc[field] : [];

    const normName = targetName.trim().toLowerCase();
    const remaining = addons.filter((a: any) => {
      const aId = String(a.id || '');
      const aName = String(a.name || '').trim().toLowerCase();
      const matchesId = aId === targetId || targetId.includes(aId) || (aId && targetId.endsWith(aId));
      const matchesName = normName && (aName === normName || aName.includes(normName));
      return !(matchesId || matchesName);
    });

    if (remaining.length !== addons.length) {
      anyDeleted = true;
      await supabase.from('room_categories')
        .update({ [field]: remaining })
        .eq('id', rc.id);
    }
  }

  return anyDeleted;
}

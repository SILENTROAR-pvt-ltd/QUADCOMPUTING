import { sanitizeCategoryAddons } from './addons.util';
import { syncCategoryRooms } from './update-rooms.util';

export async function updateAccommodationCategory(
  body: any,
  supabase: any,
  userId: string,
  authorizedBizId?: string
) {
  let business = null;
  if (authorizedBizId) {
    const { data: b } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', authorizedBizId)
      .maybeSingle();
    business = b;
  } else if (userId) {
    const { data: b } = await supabase
      .from('businesses')
      .select('id')
      .eq('host_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    business = b;
  }

  if (!business) throw new Error('Business not found');

  const {
    id,
    name,
    price,
    occupancy,
    photos,
    amenities,
    addons,
    available_addons,
    add_ons,
    updated_rooms,
    new_room_numbers,
    deleted_room_ids,
  } = body;
  if (!id) throw new Error('Category ID required');

  const { data: existingCat, error: fetchErr } = await supabase
    .from('room_categories')
    .select('*, catalog_item_id')
    .eq('id', id)
    .eq('business_id', business.id)
    .single();
  if (fetchErr || !existingCat) throw new Error('Category not found');

  const catUpdatePayload: Record<string, any> = {};
  if (name && typeof name === 'string') catUpdatePayload.name = name.trim();
  if (price !== undefined) catUpdatePayload.price = parseFloat(price);
  if (occupancy !== undefined)
    catUpdatePayload.occupancy = parseInt(occupancy, 10);
  if (photos !== undefined && Array.isArray(photos))
    catUpdatePayload.photos = photos;
  if (amenities !== undefined && Array.isArray(amenities))
    catUpdatePayload.amenities = amenities;

  const rawAddons =
    Array.isArray(addons) && addons.length > 0
      ? addons
      : Array.isArray(available_addons) && available_addons.length > 0
      ? available_addons
      : Array.isArray(add_ons) && add_ons.length > 0
      ? add_ons
      : addons || available_addons || add_ons || null;
  if (rawAddons !== null) {
    const sanitizedAddons = sanitizeCategoryAddons(rawAddons);
    catUpdatePayload.addons = sanitizedAddons;
    catUpdatePayload.available_addons = sanitizedAddons;
  }

  await syncCategoryRooms(
    supabase,
    business.id,
    id,
    updated_rooms,
    deleted_room_ids,
    new_room_numbers
  );

  const { count: totalRoomsCount } = await supabase
    .from('rooms')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id);
  if (totalRoomsCount !== null)
    catUpdatePayload.total_units = totalRoomsCount;

  const { data: updatedCat, error: catUpErr } = await supabase
    .from('room_categories')
    .update(catUpdatePayload)
    .eq('id', id)
    .eq('business_id', business.id)
    .select()
    .single();
  if (catUpErr) throw new Error(catUpErr.message);

  let targetCatalogItemId = existingCat.catalog_item_id;
  if (!targetCatalogItemId) {
    const { data: foundItem } = await supabase
      .from('catalog_items')
      .select('id')
      .eq('business_id', business.id)
      .eq('name', existingCat.name)
      .maybeSingle();
    if (foundItem) targetCatalogItemId = foundItem.id;
  }

  if (targetCatalogItemId) {
    await supabase
      .from('catalog_items')
      .update({
        ...(catUpdatePayload.name && { name: catUpdatePayload.name }),
        ...(catUpdatePayload.price !== undefined && {
          price: catUpdatePayload.price,
        }),
        ...(catUpdatePayload.photos?.[0] && {
          image_url: catUpdatePayload.photos[0],
        }),
        ...(catUpdatePayload.occupancy && {
          description: `${catUpdatePayload.occupancy} Guest Occupancy • Premium Accommodation`,
        }),
        metadata: {
          occupancy: catUpdatePayload.occupancy || existingCat.occupancy || 2,
          amenities:
            catUpdatePayload.amenities || existingCat.amenities || [],
          addons: catUpdatePayload.addons || existingCat.addons || [],
        },
      })
      .eq('id', targetCatalogItemId)
      .eq('business_id', business.id);
  }

  const { data: currentRooms } = await supabase
    .from('rooms')
    .select('*')
    .eq('category_id', id)
    .order('room_number', { ascending: true });
  return { success: true, category: updatedCat, rooms: currentRooms || [] };
}

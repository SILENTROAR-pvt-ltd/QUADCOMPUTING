export async function getAccommodationsCategories(
  supabase: any,
  userId: string,
  businessId?: string
) {
  let business = null;
  if (businessId) {
    const { data: b } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
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

  const { data: categories, error: catError } = await supabase
    .from('room_categories')
    .select(
      `*, catalog_item:catalog_items(id, name, price, is_available, image_url), rooms(*)`
    )
    .eq('business_id', business.id)
    .order('created_at', { ascending: false });

  if (catError) throw new Error(catError.message);
  return { success: true, categories: categories || [] };
}

export async function deleteAccommodationCategory(
  categoryId: string,
  supabase: any,
  userId: string,
  businessId: string
): Promise<{ success: boolean; error?: string; status?: number }> {
  // Always inside the caller's own venue: without one there is no owner to check, so nothing is deleted.
  if (!businessId) return { success: false, error: 'Venue required.', status: 400 };
  const scoped = (q: any) => q.eq('business_id', businessId);
  const { data: category } = await scoped(
    supabase.from('room_categories').select('id, catalog_item_id').eq('id', categoryId)
  ).maybeSingle();
  if (!category) return { success: false, error: 'Room category not found.', status: 404 };

  // Deleting the category deletes its rooms; a guest's stay and unpaid folio must not go with them.
  const { data: occupied } = await supabase
    .from('rooms').select('room_number').eq('category_id', categoryId).eq('status', 'OCCUPIED');
  if (occupied && occupied.length > 0) {
    const list = occupied.map((r: any) => r.room_number).join(', ');
    return { success: false, error: `Check out the guests in room ${list} before deleting this category.`, status: 409 };
  }

  if (category.catalog_item_id) {
    await scoped(supabase.from('catalog_items').delete().eq('id', category.catalog_item_id));
  }
  const { error: delError } = await scoped(supabase.from('room_categories').delete().eq('id', categoryId));
  if (delError) throw new Error(delError.message);
  return { success: true };
}

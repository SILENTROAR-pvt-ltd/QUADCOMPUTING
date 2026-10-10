import { sanitizeCategoryAddons } from './addons.util';

export async function createAccommodationCategory(
  body: any,
  supabase: any,
  userId: string,
  authorizedBizId?: string
) {
  let business = null;
  if (authorizedBizId) {
    const { data: b } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', authorizedBizId)
      .maybeSingle();
    business = b;
  } else if (userId) {
    const { data: b } = await supabase
      .from('businesses')
      .select('*')
      .eq('host_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    business = b;
  }

  if (!business) throw new Error('Business not found');

  const {
    name,
    price,
    occupancy = 2,
    total_units = 1,
    photos = [],
    amenities = [],
    addons = [],
    available_addons = [],
    room_numbers = [],
  } = body;
  if (!name || price == null) throw new Error('Name and price are required');

  let customRoomNumbers: string[] = [];
  if (Array.isArray(room_numbers)) {
    customRoomNumbers = room_numbers
      .map((r: any) => String(r).trim())
      .filter(Boolean);
  } else if (typeof room_numbers === 'string' && room_numbers.trim()) {
    customRoomNumbers = room_numbers
      .split(',')
      .map((r: string) => r.trim())
      .filter(Boolean);
  }

  const unitsCount =
    customRoomNumbers.length > 0
      ? customRoomNumbers.length
      : Math.max(1, parseInt(total_units, 10) || 1);
  const parsedPrice = parseFloat(price);
  const rawAddons =
    Array.isArray(addons) && addons.length > 0
      ? addons
      : Array.isArray(available_addons)
      ? available_addons
      : [];
  const sanitizedAddons = sanitizeCategoryAddons(rawAddons);

  const { data: category, error: catError } = await supabase
    .from('room_categories')
    .insert({
      business_id: business.id,
      name: name.trim(),
      price: parsedPrice,
      occupancy: parseInt(occupancy, 10) || 2,
      total_units: unitsCount,
      photos: Array.isArray(photos) ? photos : [],
      amenities: Array.isArray(amenities) ? amenities : [],
      addons: sanitizedAddons,
      available_addons: sanitizedAddons,
    })
    .select()
    .single();

  if (catError || !category)
    throw new Error(catError?.message || 'Failed to create room category');

  // Resolve branch/location
  const { data: loc } = await supabase
    .from('locations')
    .select('id')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const primaryImage =
    Array.isArray(photos) && photos.length > 0 ? photos[0] : null;
  const { data: catalogItem } = await supabase
    .from('catalog_items')
    .insert({
      business_id: business.id,
      location_id: loc?.id || null,
      item_type: 'room',
      name: name.trim(),
      price: parsedPrice,
      category: 'Accommodations',
      image_url: primaryImage,
      is_available: true,
      description: `${category.occupancy} Guest Occupancy • Premium Accommodation`,
      metadata: {
        capacity: category.occupancy,
        amenities: Array.isArray(amenities) ? amenities : [],
        category_id: category.id,
      },
    })
    .select()
    .single();

  if (catalogItem) {
    await supabase
      .from('room_categories')
      .update({ catalog_item_id: catalogItem.id })
      .eq('id', category.id);
    category.catalog_item_id = catalogItem.id;
  }

  const physicalRoomsToInsert = [];
  for (let i = 1; i <= unitsCount; i++) {
    const roomNum =
      customRoomNumbers[i - 1] ||
      `${name.replace(/\s+/g, '-').slice(0, 8)}-${i}`;
    physicalRoomsToInsert.push({
      business_id: business.id,
      category_id: category.id,
      room_number: roomNum,
      status: 'VACANT',
      qr_code_hash: `ROOM_${category.id.slice(0, 8)}_${roomNum.replace(
        /[^a-zA-Z0-9]/g,
        '_'
      )}_${Date.now().toString(36)}_${i}`,
    });
  }

  const { data: generatedRooms, error: roomsError } = await supabase
    .from('rooms')
    .insert(physicalRoomsToInsert)
    .select();
  if (roomsError) {
    console.error('[Accommodations] Rooms insert error:', roomsError);
  }

  try {
    const { checkFreeTier, logFreeTierUsage } = await import(
      '@/lib/services/wallet/free-tier.service'
    );
    const { evaluateFeeGuard, generateInvoiceRef } = await import(
      '@/lib/services/wallet/fee-guard.service'
    );

    const tierCheck = await checkFreeTier(supabase, business.id, 'room');
    const totalBatch = generatedRooms?.length || unitsCount;
    const beforeCount = Math.max(0, tierCheck.existingCount - totalBatch);
    const freeSlots = Math.max(0, tierCheck.threshold - beforeCount);
    const freeCount = Math.min(totalBatch, freeSlots);
    const chargedCount = totalBatch - freeCount;

    const ref = generateInvoiceRef();

    if (freeCount > 0) {
      await logFreeTierUsage(
        supabase,
        business.id,
        'room_creation',
        `${ref}-FREE(${freeCount})`
      );
    }

    if (chargedCount > 0) {
      const totalFee = chargedCount * 10.0;
      await evaluateFeeGuard(
        business.id,
        'room_creation',
        ref,
        supabase,
        totalFee
      );
    }
  } catch (feeErr) {
    console.error('[Accommodations Category Fee Guard Error]', feeErr);
  }

  return {
    success: true,
    category,
    catalogItem: catalogItem || null,
    rooms: generatedRooms || [],
  };
}

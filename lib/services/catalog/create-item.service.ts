import type { CatalogItemId } from '@/types/catalog';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createCatalogItem(body: any, supabase: any) {
  const { branchId, business_id: bodyBusinessId, name, description, price, imageUrl, itemType, category, inventoryCount, capacity, bedType, amenities, dietType, prepTimeMinutes, duration, providerType, metadata: extraMetadata } = body;
  if (!name || price == null || !itemType || !category) throw new Error('Missing required fields: name, price, itemType, category are required');

  let metadata: Record<string, any> = extraMetadata || {};
  if (itemType === 'room') {
    metadata = { ...metadata, capacity: capacity || null, bed_type: bedType || null, amenities: amenities || [] };
  } else if (itemType === 'food') {
    metadata = { ...metadata, dietary: dietType || 'veg', prep_time_minutes: prepTimeMinutes ? parseInt(prepTimeMinutes, 10) : null };
  } else if (itemType === 'service') {
    metadata = { ...metadata, duration: duration || null, provider_type: providerType || 'in_house' };
  }

  // The authenticated business (injected by the route handler from requireHost)
  // is the ONLY authority for which tenant this item belongs to. A client-supplied
  // branchId may narrow it to a specific location, but can never redirect the
  // write to a different business.
  const authBusinessId = bodyBusinessId && UUID_RE.test(bodyBusinessId) ? bodyBusinessId : null;

  let resolvedBusinessId: string | null = null;
  let resolvedLocationId: string | null = null;

  // Phase 1: if branchId is a real UUID, it must be a location owned by the
  // authenticated business. Previously this trusted whatever business the
  // location belonged to, so passing another venue's location UUID would create
  // the catalog item under THAT venue.
  if (branchId && UUID_RE.test(branchId)) {
    const { data: location } = await supabase
      .from('locations')
      .select('id, business_id')
      .eq('id', branchId)
      .maybeSingle();

    if (location?.business_id) {
      if (authBusinessId && location.business_id !== authBusinessId) {
        throw new Error('Invalid branch: that location belongs to a different business.');
      }
      resolvedBusinessId = location.business_id;
      resolvedLocationId = location.id;
    }
  }

  // Phase 2: no usable branchId (common for a freshly provisioned host whose
  // branches haven't hydrated client-side yet) — resolve this business's own
  // primary location instead of rejecting the request.
  if (!resolvedBusinessId) {
    const fallbackBizId = authBusinessId;
    if (!fallbackBizId) throw new Error('Could not determine a valid business. Please reload the page and try again.');

    // Fetch the primary location for this business
    const { data: loc } = await supabase
      .from('locations')
      .select('id, business_id')
      .eq('business_id', fallbackBizId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (loc) {
      resolvedBusinessId = loc.business_id;
      resolvedLocationId = loc.id;
    } else {
      // Business exists but has no location row yet — use business_id directly
      resolvedBusinessId = fallbackBizId;
      resolvedLocationId = null;
    }
  }

  const { data: item, error: insertError } = await supabase.from('catalog_items').insert({
    business_id: resolvedBusinessId,
    location_id: resolvedLocationId,
    item_type: itemType,
    name: name.trim(),
    description: description ? description.trim() : '',
    price,
    category: String(category).trim(),
    image_url: imageUrl || null,
    metadata,
    is_available: true,
  }).select().single();
  if (insertError) throw insertError;

  // Free Tier / Fee Guard Integration
  try {
    const { checkFreeTier, logFreeTierUsage, isFreeItemType } = await import('@/lib/services/wallet/free-tier.service');
    const { evaluateFeeGuard } = await import('@/lib/services/wallet/fee-guard.service');

    // Services and Add-ons are 100% free (₹0.00) and completely bypass fees
    if (!isFreeItemType(itemType, category)) {
      const isRoom = itemType === 'room' || itemType === 'room_accommodation';
      const kind = isRoom ? 'room' : 'menu';
      const tierCheck = await checkFreeTier(supabase, resolvedBusinessId!, kind);
      if (tierCheck.isFree) {
        await logFreeTierUsage(supabase, resolvedBusinessId!, tierCheck.action, item.id);
      } else {
        await evaluateFeeGuard(resolvedBusinessId!, tierCheck.action, item.id, supabase, tierCheck.cost);
      }
    }
  } catch (guardErr) {
    console.error('[Catalog Create Item Fee Guard]', guardErr);
  }

  if (inventoryCount !== undefined && inventoryCount !== null) {
    await supabase.from('inventory_stock').insert({ catalog_item_id: item.id, stock_quantity: inventoryCount, low_stock_threshold: 5 });
  }

  return {
    id: item.id as CatalogItemId,
    branchId: item.location_id,
    name: item.name,
    description: item.description || '',
    imageUrl: item.image_url,
    status: item.is_available ? 'active' : 'inactive',
    addons: [],
    createdAt: item.created_at,
    updatedAt: item.created_at,
    ...(item.item_type === 'food' && {
      kind: 'food_beverage', course: item.category, dietary: 'veg',
      price: { amountMinor: Number(item.price), currency: 'INR' },
      prepTimeMinutes: null, allergens: [],
    }),
    ...(item.item_type === 'room' && {
      kind: 'accommodation', roomType: item.category,
      nightlyRate: { amountMinor: Number(item.price), currency: 'INR' },
      capacity: item.metadata?.capacity || null, bedType: item.metadata?.bed_type || null,
      amenities: item.metadata?.amenities || [], occupancy: { adults: 2, children: 0 }, inventoryCount: inventoryCount || 1,
    }),
  };
}

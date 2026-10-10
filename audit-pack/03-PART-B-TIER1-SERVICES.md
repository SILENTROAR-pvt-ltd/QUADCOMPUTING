# PART B — TIER 1 CODE EXTRACTION (Domain Services: guest-order, session, inventory, wallet, billing, tax)

All service routines below are extracted 100% VERBATIM. Sensitive keys and tokens are replaced with `[REDACTED]`.

---

### lib/services/accommodation.service.ts (6 lines)
```typescript
export * from './accommodation/addons.util';
export * from './accommodation/category-crud.service';
export * from './accommodation/create-category.service';
export * from './accommodation/update-rooms.util';
export * from './accommodation/update-category.service';

```

### lib/services/accommodation/addons.util.ts (10 lines)
```typescript
export function sanitizeCategoryAddons(rawAddons: any[]) {
  return (rawAddons || []).map((a: any, idx: number) => ({
    id: a.id || `addon_${idx}_${Date.now()}`,
    name: String(a.name || 'Extra Service').trim(),
    price: typeof a.price === 'number' ? a.price : parseFloat(a.price) || 0,
    isActive: a.isActive !== undefined ? Boolean(a.isActive) : true,
    billingType: ['per_night', 'per_person_per_day', 'per_stay'].includes(a.billingType) ? a.billingType : 'per_night',
  }));
}

```

### lib/services/accommodation/category-crud.service.ts (32 lines)
```typescript
export async function getAccommodationsCategories(supabase: any, userId: string) {
  let business = null;
  if (userId) {
    const { data: b } = await supabase.from('businesses').select('id').eq('host_id', userId).limit(1).maybeSingle();
    business = b;
  }
  if (!business) {
    const { data: fb } = await supabase.from('businesses').select('id').limit(1).maybeSingle();
    business = fb;
  }
  if (!business) throw new Error('Business not found');

  const { data: categories, error: catError } = await supabase
    .from('room_categories')
    .select(`*, catalog_item:catalog_items(id, name, price, is_available, image_url), rooms(*)`)
    .eq('business_id', business.id)
    .order('created_at', { ascending: false });

  if (catError) throw new Error(catError.message);
  return { success: true, categories: categories || [] };
}

export async function deleteAccommodationCategory(categoryId: string, supabase: any, userId: string) {
  const { data: category } = await supabase.from('room_categories').select('id, catalog_item_id').eq('id', categoryId).single();
  if (category?.catalog_item_id) {
    await supabase.from('catalog_items').delete().eq('id', category.catalog_item_id);
  }
  const { error: delError } = await supabase.from('room_categories').delete().eq('id', categoryId);
  if (delError) throw new Error(delError.message);
  return { success: true };
}

```

### lib/services/accommodation/create-category.service.ts (116 lines)
```typescript
import { sanitizeCategoryAddons } from './addons.util';

export async function createAccommodationCategory(body: any, supabase: any, userId: string) {
  let business = null;
  if (userId) {
    const { data: b } = await supabase.from('businesses').select('*').eq('host_id', userId).limit(1).maybeSingle();
    business = b;
  }
  if (!business) {
    const { data: fb } = await supabase.from('businesses').select('*').limit(1).maybeSingle();
    business = fb;
  }
  if (!business) throw new Error('Business not found');

  const { name, price, occupancy = 2, total_units = 1, photos = [], amenities = [], addons = [], available_addons = [], room_numbers = [] } = body;
  if (!name || price == null) throw new Error('Name and price are required');

  let customRoomNumbers: string[] = [];
  if (Array.isArray(room_numbers)) {
    customRoomNumbers = room_numbers.map((r: any) => String(r).trim()).filter(Boolean);
  } else if (typeof room_numbers === 'string' && room_numbers.trim()) {
    customRoomNumbers = room_numbers.split(',').map((r: string) => r.trim()).filter(Boolean);
  }

  const unitsCount = customRoomNumbers.length > 0 ? customRoomNumbers.length : Math.max(1, parseInt(total_units, 10) || 1);
  const parsedPrice = parseFloat(price);
  const rawAddons = Array.isArray(addons) && addons.length > 0 ? addons : Array.isArray(available_addons) ? available_addons : [];
  const sanitizedAddons = sanitizeCategoryAddons(rawAddons);

  const { data: category, error: catError } = await supabase.from('room_categories').insert({
    business_id: business.id,
    name: name.trim(),
    price: parsedPrice,
    occupancy: parseInt(occupancy, 10) || 2,
    total_units: unitsCount,
    photos: Array.isArray(photos) ? photos : [],
    amenities: Array.isArray(amenities) ? amenities : [],
    addons: sanitizedAddons,
    available_addons: sanitizedAddons,
  }).select().single();

  if (catError || !category) throw new Error(catError?.message || 'Failed to create room category');

  // Resolve branch/location
  const { data: loc } = await supabase.from('locations').select('id').eq('business_id', business.id).limit(1).maybeSingle();

  const primaryImage = Array.isArray(photos) && photos.length > 0 ? photos[0] : null;
  const { data: catalogItem } = await supabase.from('catalog_items').insert({
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
    }
  }).select().single();

  if (catalogItem) {
    await supabase.from('room_categories').update({ catalog_item_id: catalogItem.id }).eq('id', category.id);
    category.catalog_item_id = catalogItem.id;
  }

  const physicalRoomsToInsert = [];
  for (let i = 1; i <= unitsCount; i++) {
    const roomNum = customRoomNumbers[i - 1] || `${name.replace(/\s+/g, '-').slice(0, 8)}-${i}`;
    physicalRoomsToInsert.push({
      business_id: business.id,
      category_id: category.id,
      room_number: roomNum,
      status: 'VACANT',
      qr_code_hash: `ROOM_${category.id.slice(0, 8)}_${roomNum.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now().toString(36)}_${i}`,
    });
  }

  const { data: generatedRooms, error: roomsError } = await supabase.from('rooms').insert(physicalRoomsToInsert).select();
  if (roomsError) {
    console.error('[Accommodations] Rooms insert error:', roomsError);
  }

  // Free Setup Threshold Check & Fee Guard for Room Creation:
  // First 2 rooms free (0.00), 3rd room onwards triggers ₹10.00 charge
  try {
    const { checkFreeTier, logFreeTierUsage } = await import('@/lib/services/wallet/free-tier.service');
    const { evaluateFeeGuard, generateInvoiceRef } = await import('@/lib/services/wallet/fee-guard.service');

    const tierCheck = await checkFreeTier(supabase, business.id, 'room');
    const totalBatch = generatedRooms?.length || unitsCount;
    const beforeCount = Math.max(0, tierCheck.existingCount - totalBatch);
    const freeSlots = Math.max(0, tierCheck.threshold - beforeCount); // threshold is 2
    const freeCount = Math.min(totalBatch, freeSlots);
    const chargedCount = totalBatch - freeCount;

    const ref = generateInvoiceRef();

    if (freeCount > 0) {
      await logFreeTierUsage(supabase, business.id, 'room_creation', `${ref}-FREE(${freeCount})`);
    }

    if (chargedCount > 0) {
      const totalFee = chargedCount * 10.00; // Exactly ₹10.00 per room
      await evaluateFeeGuard(business.id, 'room_creation', ref, supabase, totalFee);
    }
  } catch (feeErr) {
    console.error('[Accommodations Category Fee Guard Error]', feeErr);
  }

  return { success: true, category, catalogItem: catalogItem || null, rooms: generatedRooms || [] };
}

```

### lib/services/accommodation/update-category.service.ts (63 lines)
```typescript
import { sanitizeCategoryAddons } from './addons.util';
import { syncCategoryRooms } from './update-rooms.util';

export async function updateAccommodationCategory(body: any, supabase: any, userId: string) {
  let business = null;
  if (userId) {
    const { data: b } = await supabase.from('businesses').select('id').eq('host_id', userId).limit(1).maybeSingle();
    business = b;
  }
  if (!business) {
    const { data: fb } = await supabase.from('businesses').select('id').limit(1).maybeSingle();
    business = fb;
  }
  if (!business) throw new Error('Business not found');

  const { id, name, price, occupancy, photos, amenities, addons, available_addons, add_ons, updated_rooms, new_room_numbers, deleted_room_ids } = body;
  if (!id) throw new Error('Category ID required');

  const { data: existingCat, error: fetchErr } = await supabase.from('room_categories').select('*, catalog_item_id').eq('id', id).eq('business_id', business.id).single();
  if (fetchErr || !existingCat) throw new Error('Category not found');

  const catUpdatePayload: Record<string, any> = {};
  if (name && typeof name === 'string') catUpdatePayload.name = name.trim();
  if (price !== undefined) catUpdatePayload.price = parseFloat(price);
  if (occupancy !== undefined) catUpdatePayload.occupancy = parseInt(occupancy, 10);
  if (photos !== undefined && Array.isArray(photos)) catUpdatePayload.photos = photos;
  if (amenities !== undefined && Array.isArray(amenities)) catUpdatePayload.amenities = amenities;

  const rawAddons = (Array.isArray(addons) && addons.length > 0) ? addons : (Array.isArray(available_addons) && available_addons.length > 0) ? available_addons : (Array.isArray(add_ons) && add_ons.length > 0) ? add_ons : (addons || available_addons || add_ons || null);
  if (rawAddons !== null) {
    const sanitizedAddons = sanitizeCategoryAddons(rawAddons);
    catUpdatePayload.addons = sanitizedAddons;
    catUpdatePayload.available_addons = sanitizedAddons;
  }

  await syncCategoryRooms(supabase, business.id, id, updated_rooms, deleted_room_ids, new_room_numbers);

  const { count: totalRoomsCount } = await supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('category_id', id);
  if (totalRoomsCount !== null) catUpdatePayload.total_units = totalRoomsCount;

  const { data: updatedCat, error: catUpErr } = await supabase.from('room_categories').update(catUpdatePayload).eq('id', id).select().single();
  if (catUpErr) throw new Error(catUpErr.message);

  let targetCatalogItemId = existingCat.catalog_item_id;
  if (!targetCatalogItemId) {
    const { data: foundItem } = await supabase.from('catalog_items').select('id').eq('business_id', business.id).eq('name', existingCat.name).maybeSingle();
    if (foundItem) targetCatalogItemId = foundItem.id;
  }

  if (targetCatalogItemId) {
    await supabase.from('catalog_items').update({
      ...(catUpdatePayload.name && { name: catUpdatePayload.name }),
      ...(catUpdatePayload.price !== undefined && { price: catUpdatePayload.price }),
      ...(catUpdatePayload.photos?.[0] && { image_url: catUpdatePayload.photos[0] }),
      ...(catUpdatePayload.occupancy && { description: `${catUpdatePayload.occupancy} Guest Occupancy • Premium Accommodation` }),
      metadata: { occupancy: catUpdatePayload.occupancy || existingCat.occupancy || 2, amenities: catUpdatePayload.amenities || existingCat.amenities || [], addons: catUpdatePayload.addons || existingCat.addons || [] },
    }).eq('id', targetCatalogItemId);
  }

  const { data: currentRooms } = await supabase.from('rooms').select('*').eq('category_id', id).order('room_number', { ascending: true });
  return { success: true, category: updatedCat, rooms: currentRooms || [] };
}

```

### lib/services/accommodation/update-rooms.util.ts (65 lines)
```typescript
export async function syncCategoryRooms(
  supabase: any,
  businessId: string,
  categoryId: string,
  updatedRooms?: any[],
  deletedRoomIds?: any[],
  newRoomNumbers?: any[]
) {
  if (Array.isArray(updatedRooms) && updatedRooms.length > 0) {
    for (const item of updatedRooms) {
      if (item.id && item.room_number?.trim()) {
        await supabase.from('rooms').update({ room_number: item.room_number.trim() }).eq('id', item.id).eq('business_id', businessId);
      }
    }
  }

  if (Array.isArray(deletedRoomIds) && deletedRoomIds.length > 0) {
    for (const roomId of deletedRoomIds) {
      await supabase.from('rooms').delete().eq('id', roomId).eq('business_id', businessId).neq('status', 'OCCUPIED');
    }
  }

  if (Array.isArray(newRoomNumbers) && newRoomNumbers.length > 0) {
    const roomsToInsert = newRoomNumbers
      .map((r: any) => String(r).trim())
      .filter(Boolean)
      .map((num: string, idx: number) => ({
        business_id: businessId,
        category_id: categoryId,
        room_number: num,
        status: 'VACANT',
        qr_code_hash: `ROOM_${categoryId.slice(0, 8)}_${num.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${idx}`,
      }));
    if (roomsToInsert.length > 0) {
      const { data: insertedRooms } = await supabase.from('rooms').insert(roomsToInsert).select();

      // Free Setup Threshold Check & Fee Guard for newly added room units
      try {
        const { checkFreeTier, logFreeTierUsage } = await import('@/lib/services/wallet/free-tier.service');
        const { evaluateFeeGuard, generateInvoiceRef } = await import('@/lib/services/wallet/fee-guard.service');

        const tierCheck = await checkFreeTier(supabase, businessId, 'room');
        const totalBatch = insertedRooms?.length || roomsToInsert.length;
        const beforeCount = Math.max(0, tierCheck.existingCount - totalBatch);
        const freeSlots = Math.max(0, tierCheck.threshold - beforeCount);
        const freeCount = Math.min(totalBatch, freeSlots);
        const chargedCount = totalBatch - freeCount;

        const ref = generateInvoiceRef();

        if (freeCount > 0) {
          await logFreeTierUsage(supabase, businessId, 'room_creation', `${ref}-FREE(${freeCount})`);
        }

        if (chargedCount > 0) {
          const totalFee = chargedCount * 10.00;
          await evaluateFeeGuard(businessId, 'room_creation', ref, supabase, totalFee);
        }
      } catch (guardErr) {
        console.error('[Accommodations syncCategoryRooms FeeGuard Error]', guardErr);
      }
    }
  }
}

```

### lib/services/analytics.service.ts (35 lines)
```typescript
import { resolveAnalyticsDateRange } from './analytics/date-range.util';
import { fetchAnalyticsData } from './analytics/fetch-data.service';
import { buildInitialTrendsMap } from './analytics/trends-builder.util';
import { aggregateOrdersAndLogs } from './analytics/aggregations.util';
import { computeOrderAndInventoryStatus } from './analytics/order-status.util';

export async function computeEodReport(requestUrl: string, supabase: any) {
  const { timeframe, startDate, endDate } = resolveAnalyticsDateRange(requestUrl);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Unauthorized');

  const { data: business } = await supabase.from('businesses').select('id').eq('host_id', user.id).single();
  if (!business) throw new Error('Business not found');

  const { orders, tickets, logs, rawItems, rawPromos } = await fetchAnalyticsData(supabase, business.id, startDate, endDate);
  const trendsMap = buildInitialTrendsMap(timeframe, startDate, endDate);
  const { gross_revenue, actual_cogs, total_discounts_given, total_gst_collected, payment_breakdown, best_selling } =
    aggregateOrdersAndLogs(orders, logs, timeframe, trendsMap);
  const { total_orders, completed_orders, pending_kitchen, critical_items, active_promotions } =
    computeOrderAndInventoryStatus(orders, tickets, rawItems, rawPromos);

  const revenue_trends = Object.values(trendsMap).map((d) => ({ timestamp: d.timestamp, revenue: d.revenue, expenses: d.expenses }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const chartData = Object.values(trendsMap).map((d) => ({ label: d.label, revenue: d.revenue, orders: d.orders, timestamp: d.timestamp }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return {
    sales_overview: { gross_revenue, gross_profit: gross_revenue - actual_cogs, goal_percentage: 85, revenue_growth: 12.4 },
    user_engagement: { total_orders_today: total_orders, new_guests: Math.floor(total_orders * 0.4), returning_guests_pct: 60 },
    order_status: { total: total_orders, completed: completed_orders, pending_kitchen },
    best_selling, active_promotions, critical_items, revenue_trends, chartData, payment_breakdown,
    start_date: startDate, end_date: endDate, total_discounts_given, total_gst_collected, actual_cogs,
  };
}

```

### lib/services/analytics/aggregations.util.ts (105 lines)
```typescript
import type { TrendEntry } from './trends-builder.util';

export function aggregateOrdersAndLogs(orders: any[], logs: any[], timeframe: string, trendsMap: Record<string, TrendEntry>) {
  let gross_revenue = 0, actual_cogs = 0, total_discounts_given = 0, total_gst_collected = 0;
  const payment_breakdown = { upi: 0, cash: 0, card: 0 };
  const itemSales: Record<string, { name: string; sold_count: number; revenue: number }> = {};

  for (const order of orders) {
    const rev = Number(order.grand_total) || 0;
    gross_revenue += rev;
    total_discounts_given += Number(order.discount_amount) || 0;
    total_gst_collected += Number(order.tax_amount) || 0;

    const pm = order.payment_method || 'UPI';
    if (pm === 'UPI') payment_breakdown.upi += rev;
    else if (pm === 'CASH') payment_breakdown.cash += rev;
    else if (pm === 'CARD') payment_breakdown.card += rev;

    const orderDate = new Date(order.created_at);
    if (!isNaN(orderDate.getTime())) {
      let key: string;
      let label: string;
      if (timeframe === 'daily') {
        const hourStr = orderDate.getHours().toString().padStart(2, '0');
        key = `${hourStr}:00`;
        const ampm = orderDate.getHours() >= 12 ? 'PM' : 'AM';
        const displayHour = orderDate.getHours() % 12 === 0 ? 12 : orderDate.getHours() % 12;
        label = `${displayHour.toString().padStart(2, '0')} ${ampm}`;
      } else if (timeframe === 'monthly') {
        const year = orderDate.getFullYear();
        const month = String(orderDate.getMonth() + 1).padStart(2, '0');
        key = `${year}-${month}`;
        label = orderDate.toLocaleDateString('en-US', { month: 'short' });
      } else {
        key = orderDate.toISOString().split('T')[0];
        label = timeframe === 'weekly'
          ? orderDate.toLocaleDateString('en-US', { weekday: 'short' })
          : orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      if (!trendsMap[key]) {
        trendsMap[key] = {
          revenue: 0,
          expenses: 0,
          orders: 0,
          label,
          timestamp: timeframe === 'monthly' ? `${key}-01T00:00:00Z` : order.created_at,
        };
      }
      trendsMap[key].revenue += rev;
      trendsMap[key].orders += 1;
    }

    for (const item of (Array.isArray(order.items) ? order.items : [])) {
      if (item.id === 'custom') continue;
      const uPrice = Number(item.price?.amountMinor || item.nightlyRate?.amountMinor || item.price || item.unitPrice || item.unit_price || 0);
      const qty = Number(item.quantity || item.qty || 1);
      if (!itemSales[item.id]) itemSales[item.id] = { name: item.name, sold_count: 0, revenue: 0 };
      itemSales[item.id].sold_count += qty;
      itemSales[item.id].revenue += uPrice * qty;
    }
  }

  for (const log of logs) {
    const cost = Number(log.total_cost) || 0;
    actual_cogs += cost;
    const logDate = new Date(log.logged_at);
    if (!isNaN(logDate.getTime())) {
      let key: string;
      let label: string;
      if (timeframe === 'daily') {
        const hourStr = logDate.getHours().toString().padStart(2, '0');
        key = `${hourStr}:00`;
        const ampm = logDate.getHours() >= 12 ? 'PM' : 'AM';
        const displayHour = logDate.getHours() % 12 === 0 ? 12 : logDate.getHours() % 12;
        label = `${displayHour.toString().padStart(2, '0')} ${ampm}`;
      } else if (timeframe === 'monthly') {
        const year = logDate.getFullYear();
        const month = String(logDate.getMonth() + 1).padStart(2, '0');
        key = `${year}-${month}`;
        label = logDate.toLocaleDateString('en-US', { month: 'short' });
      } else {
        key = logDate.toISOString().split('T')[0];
        label = timeframe === 'weekly'
          ? logDate.toLocaleDateString('en-US', { weekday: 'short' })
          : logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      if (!trendsMap[key]) {
        trendsMap[key] = {
          revenue: 0,
          expenses: 0,
          orders: 0,
          label,
          timestamp: timeframe === 'monthly' ? `${key}-01T00:00:00Z` : log.logged_at,
        };
      }
      trendsMap[key].expenses += cost;
    }
  }

  const best_selling = Object.entries(itemSales).map(([id, d]) => ({ id, ...d })).sort((a, b) => b.revenue - a.revenue);
  return { gross_revenue, actual_cogs, total_discounts_given, total_gst_collected, payment_breakdown, best_selling };
}

```

### lib/services/analytics/date-range.util.ts (37 lines)
```typescript
export function resolveAnalyticsDateRange(requestUrl: string): { timeframe: string; startDate: string; endDate: string } {
  const { searchParams } = new URL(requestUrl);
  const rawParam = searchParams.get('range') || searchParams.get('timeframe') || searchParams.get('interval') || 'daily';
  const timeframe = rawParam.toLowerCase();
  let start_date = searchParams.get('start_date') || searchParams.get('startDate');
  let end_date = searchParams.get('end_date') || searchParams.get('endDate');

  if (timeframe === 'custom') {
    const customStart = searchParams.get('startDate') || searchParams.get('start_date');
    const customEnd = searchParams.get('endDate') || searchParams.get('end_date');
    if (customStart && customEnd) {
      start_date = new Date(`${customStart}T00:00:00.000Z`).toISOString();
      end_date = new Date(`${customEnd}T23:59:59.999Z`).toISOString();
    }
  }

  if (!start_date || !end_date) {
    const now = new Date();
    if (timeframe === 'weekly') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      start_date = start.toISOString();
      end_date = end.toISOString();
    } else if (timeframe === 'monthly') {
      const start = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      start_date = start.toISOString();
      end_date = end.toISOString();
    } else {
      start_date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
      end_date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
    }
  }

  return { timeframe, startDate: start_date, endDate: end_date };
}

```

### lib/services/analytics/fetch-data.service.ts (23 lines)
```typescript
export async function fetchAnalyticsData(supabase: any, businessId: string, startDate: string, endDate: string) {
  const [
    { data: orders },
    { data: tickets },
    { data: logs },
    { data: rawItems },
    { data: rawPromos },
  ] = await Promise.all([
    supabase.from('orders').select('id, items, grand_total, discount_amount, tax_amount, payment_method, created_at')
      .eq('business_id', businessId).gte('created_at', startDate).lte('created_at', endDate),
    supabase.from('kitchen_tickets').select('id, order_id, status')
      .eq('business_id', businessId).gte('created_at', startDate).lte('created_at', endDate),
    supabase.from('inventory_logs').select('total_cost, logged_at')
      .eq('business_id', businessId).eq('action_type', 'CONSUMPTION').gte('logged_at', startDate).lte('logged_at', endDate),
    supabase.from('raw_inventory_items').select('id, item_name, current_stock, unit, threshold')
      .eq('business_id', businessId),
    supabase.from('promotions').select('id, title, discount_type, discount_value')
      .eq('business_id', businessId).eq('is_active', true).order('created_at', { ascending: false }),
  ]);

  return { orders: orders || [], tickets: tickets || [], logs: logs || [], rawItems: rawItems || [], rawPromos: rawPromos || [] };
}

```

### lib/services/analytics/order-status.util.ts (35 lines)
```typescript
export function computeOrderAndInventoryStatus(orders: any[], tickets: any[], rawItems: any[], rawPromos: any[]) {
  const total_orders = orders.length;
  let completed_orders = 0;
  let pending_kitchen = 0;

  for (const order of orders) {
    const ticket = tickets.find((t: any) => t.order_id === order.id);
    if (ticket) {
      if (ticket.status === 'SERVED') completed_orders++;
      else if (['PENDING', 'PREPARING', 'READY'].includes(ticket.status)) pending_kitchen++;
    } else if (order.payment_method) {
      completed_orders++;
    }
  }

  const critical_items = (rawItems || [])
    .filter((i: any) => i.current_stock <= (i.threshold || 10))
    .map((i: any) => ({
      id: i.id,
      name: i.item_name,
      current_stock: i.current_stock,
      unit: i.unit,
      reorder_level: i.threshold || 10,
    }));

  const active_promotions = (rawPromos || []).map((p: any) => ({
    id: p.id,
    name: p.title,
    discount_type: p.discount_type === 'PERCENTAGE' || p.discount_type === 'percentage' ? 'PERCENTAGE' : 'FLAT',
    value: p.discount_value,
  }));

  return { total_orders, completed_orders, pending_kitchen, critical_items, active_promotions };
}

```

### lib/services/analytics/trends-builder.util.ts (90 lines)
```typescript
export type TrendEntry = { revenue: number; expenses: number; orders: number; label: string; timestamp: string };

export function buildInitialTrendsMap(timeframe: string, startDate?: string, endDate?: string): Record<string, TrendEntry> {
  const trendsMap: Record<string, TrendEntry> = {};

  if (timeframe === 'daily') {
    const todayStr = new Date().toISOString().split('T')[0];
    for (let i = 0; i < 24; i++) {
      const hourStr = i.toString().padStart(2, '0');
      const ampm = i >= 12 ? 'PM' : 'AM';
      const displayHour = i % 12 === 0 ? 12 : i % 12;
      trendsMap[`${hourStr}:00`] = {
        revenue: 0,
        expenses: 0,
        orders: 0,
        label: `${displayHour.toString().padStart(2, '0')} ${ampm}`,
        timestamp: `${todayStr}T${hourStr}:00:00Z`,
      };
    }
  } else if (timeframe === 'weekly') {
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trendsMap[dateStr] = {
        revenue: 0,
        expenses: 0,
        orders: 0,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        timestamp: `${dateStr}T00:00:00Z`,
      };
    }
  } else if (timeframe === 'monthly') {
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const end = endDate ? new Date(endDate) : new Date();
    const curr = new Date(start.getFullYear(), start.getMonth(), 1);

    while (curr <= end) {
      const year = curr.getFullYear();
      const month = String(curr.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`;
      trendsMap[key] = {
        revenue: 0,
        expenses: 0,
        orders: 0,
        label: curr.toLocaleDateString('en-US', { month: 'short' }),
        timestamp: `${key}-01T00:00:00Z`,
      };
      curr.setMonth(curr.getMonth() + 1);
    }
  } else if (timeframe === 'custom' && startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 62) {
      const curr = new Date(start);
      while (curr <= end) {
        const dateStr = curr.toISOString().split('T')[0];
        trendsMap[dateStr] = {
          revenue: 0,
          expenses: 0,
          orders: 0,
          label: curr.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          timestamp: `${dateStr}T00:00:00Z`,
        };
        curr.setDate(curr.getDate() + 1);
      }
    } else {
      const curr = new Date(start.getFullYear(), start.getMonth(), 1);
      while (curr <= end) {
        const year = curr.getFullYear();
        const month = String(curr.getMonth() + 1).padStart(2, '0');
        const key = `${year}-${month}`;
        trendsMap[key] = {
          revenue: 0,
          expenses: 0,
          orders: 0,
          label: curr.toLocaleDateString('en-US', { month: 'short' }),
          timestamp: `${key}-01T00:00:00Z`,
        };
        curr.setMonth(curr.getMonth() + 1);
      }
    }
  }

  return trendsMap;
}

```

### lib/services/api-idempotency.util.ts (70 lines)
```typescript
// lib/services/api-idempotency.util.ts

interface CachedResponse {
  timestamp: number;
  response: any;
  status: number;
}

const idempotencyCache = new Map<string, CachedResponse>();
const inFlightRequests = new Map<string, Promise<any>>();
const WINDOW_MS = 2000; // 2-second anti-frantic window

// Auto-cleanup expired keys every 30 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of Array.from(idempotencyCache.entries())) {
      if (now - val.timestamp > WINDOW_MS * 5) {
        idempotencyCache.delete(key);
      }
    }
  }, 30000);
}

export function generateIdempotencyKey(scope: string, identifier: string, payload?: any): string {
  if (payload?.idempotency_key) return `${scope}:${payload.idempotency_key}`;
  const payloadFingerprint = payload ? JSON.stringify(payload).length : 0;
  return `${scope}:${identifier.trim().toUpperCase()}:${payloadFingerprint}`;
}

export function checkIdempotency(key: string): { isDuplicate: boolean; cachedResult?: any; status?: number } {
  const existing = idempotencyCache.get(key);
  if (existing && Date.now() - existing.timestamp < WINDOW_MS) {
    return { isDuplicate: true, cachedResult: existing.response, status: existing.status };
  }
  return { isDuplicate: false };
}

export function recordIdempotentResponse(key: string, response: any, status: number = 200) {
  idempotencyCache.set(key, { timestamp: Date.now(), response, status });
}

export async function withIdempotency<T>(
  key: string,
  fn: () => Promise<{ response: T; status?: number }>
): Promise<{ response: T; status: number; duplicate?: boolean }> {
  const check = checkIdempotency(key);
  if (check.isDuplicate) {
    return { response: check.cachedResult, status: check.status || 200, duplicate: true };
  }

  // Handle in-flight duplicate requests
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)!;
  }

  const execPromise = (async () => {
    try {
      const result = await fn();
      recordIdempotentResponse(key, result.response, result.status || 200);
      return { response: result.response, status: result.status || 200 };
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, execPromise);
  return execPromise;
}

```

### lib/services/catalog-delete-addon.service.ts (45 lines)
```typescript
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

```

### lib/services/catalog-delete.service.ts (58 lines)
```typescript
import { deleteRoomCategoryAddon } from './catalog-delete-addon.service';

export async function executeCatalogDelete(request: Request, supabase: any) {
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

  // Business resolution with dev fallback
  let businessId = 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.id) {
    const { data: b } = await supabase.from('businesses').select('id').eq('host_id', user.id).maybeSingle();
    if (b?.id) businessId = b.id;
  }

  // 1. Try deleting room category add-on (e.g. Breakfast CP)
  const isAddon = itemMetadata.source === 'room_category_addon' || targetId.startsWith('addon_') || itemName.includes('(CP)');
  const addonDeleted = await deleteRoomCategoryAddon(supabase, businessId, targetId, itemName, itemMetadata.room_category_id);
  if (isAddon && addonDeleted) {
    return { success: true, message: 'Room add-on deleted successfully', deleted_id: targetId };
  }

  // 2. Cascade delete dependent recipes & inventory
  try {
    if (targetId) {
      await supabase.from('recipe_ingredients').delete().eq('catalog_item_id', targetId);
      await supabase.from('inventory_stock').delete().eq('catalog_item_id', targetId);
      await supabase.from('menu_items').delete().or(`id.eq.${targetId},name.eq.${itemName}`);
    }
  } catch {}

  // 3. Delete from catalog_items (hard delete with soft fallback)
  const { error: err } = await supabase.from('catalog_items').delete().eq('id', targetId);
  if (err && targetId) {
    await supabase.from('catalog_items').update({
      is_available: false,
      metadata: { deleted: true, archived: true, deleted_at: new Date().toISOString() },
    }).eq('id', targetId);
  }

  return { success: true, message: 'Item deleted from catalog', deleted_id: targetId };
}

```

### lib/services/catalog.service.ts (6 lines)
```typescript
export * from './catalog/resolve-business.util';
export * from './catalog/catalog-formatter.util';
export * from './catalog/fetch-catalog.service';
export * from './catalog/create-item.service';
export * from './catalog/delete-item.service';

```

### lib/services/catalog/catalog-formatter.util.ts (58 lines)
```typescript
export function formatCatalogItems(combinedCatalog: any[], roomCategories: any[]) {
  const formattedCatalog = combinedCatalog.map((item: any) => {
    let category = item.category || 'Services';
    const itemType = (item.item_type || (item.category?.toLowerCase().includes('accommodation') ? 'room' : 'food')).toLowerCase();

    if (itemType === 'food' || itemType === 'beverage' || itemType === 'drink') {
      category = item.category || 'F&B';
    } else if (itemType === 'room' || itemType === 'accommodation') {
      category = 'Accommodations';
    }

    return {
      id: item.id,
      name: item.name,
      price: Number(item.price) || 0,
      tax_rate: typeof item.metadata?.tax_rate === 'number' ? item.metadata.tax_rate : 0.05,
      category,
      item_type: itemType,
      is_available: item.is_available ?? true,
      image_url: item.image_url || null,
      description: item.description || '',
      metadata: item.metadata || {},
    };
  });

  const addonServices: any[] = [];
  const seenAddonNames = new Set<string>();

  roomCategories.forEach((rc: any) => {
    const rawList = Array.isArray(rc.addons) && rc.addons.length > 0 ? rc.addons : Array.isArray(rc.available_addons) ? rc.available_addons : [];
    rawList.forEach((a: any) => {
      const aName = (a.name || '').trim();
      const aKey = aName.toLowerCase();
      if (aName && !seenAddonNames.has(aKey)) {
        seenAddonNames.add(aKey);
        addonServices.push({
          id: a.id || `addon_${rc.id}_${aKey.replace(/\s+/g, '_')}`,
          name: aName,
          price: Number(a.price) || 0,
          tax_rate: 0.18,
          category: 'Services',
          item_type: 'service',
          is_available: a.isActive ?? true,
          image_url: null,
          description: `Add-on (${rc.name}) • ${a.billingType ? a.billingType.replace(/_/g, ' ') : 'per stay'}`,
          metadata: { billing_type: a.billingType || 'per_stay', source: 'room_category_addon', room_category_id: rc.id },
        });
      }
    });
  });

  const allItems = [...formattedCatalog, ...addonServices];
  const categorySet = new Set<string>();
  allItems.forEach((it) => it.category && categorySet.add(it.category));

  return { allItems, categories: ['All', ...Array.from(categorySet)] };
}

```

### lib/services/catalog/create-item.service.ts (72 lines)
```typescript
import type { CatalogItemId } from '@/types/catalog';

export async function createCatalogItem(body: any, supabase: any) {
  const { branchId, name, description, price, imageUrl, itemType, category, inventoryCount, capacity, bedType, amenities, dietType, prepTimeMinutes, duration, providerType, metadata: extraMetadata } = body;
  if (!name || price == null || !branchId || !itemType || !category) throw new Error('Missing required fields');

  let metadata: Record<string, any> = extraMetadata || {};
  if (itemType === 'room') {
    metadata = { ...metadata, capacity: capacity || null, bed_type: bedType || null, amenities: amenities || [] };
  } else if (itemType === 'food') {
    metadata = { ...metadata, dietary: dietType || 'veg', prep_time_minutes: prepTimeMinutes ? parseInt(prepTimeMinutes, 10) : null };
  } else if (itemType === 'service') {
    metadata = { ...metadata, duration: duration || null, provider_type: providerType || 'in_house' };
  }

  const { data: location, error: locError } = await supabase.from('locations').select('business_id').eq('id', branchId).single();
  if (locError || !location) throw new Error('Invalid branch ID or ownership not confirmed.');

  const { data: item, error: insertError } = await supabase.from('catalog_items').insert({
    business_id: location.business_id, location_id: branchId, item_type: itemType, name: name.trim(), description: description ? description.trim() : '', price,
    category: String(category).trim(), image_url: imageUrl || null, metadata, is_available: true,
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
      const tierCheck = await checkFreeTier(supabase, location.business_id, kind);
      if (tierCheck.isFree) {
        await logFreeTierUsage(supabase, location.business_id, tierCheck.action, item.id);
      } else {
        await evaluateFeeGuard(location.business_id, tierCheck.action, item.id, supabase, tierCheck.cost);
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

```

### lib/services/catalog/delete-item.service.ts (16 lines)
```typescript
export async function deleteCatalogItem(itemId: string, supabase: any) {
  try { await supabase.from('recipe_ingredients').delete().eq('catalog_item_id', itemId); } catch {}
  try { await supabase.from('inventory_stock').delete().eq('catalog_item_id', itemId); } catch {}
  try { await supabase.from('room_categories').delete().or(`catalog_item_id.eq.${itemId},id.eq.${itemId}`); } catch {}

  const { error: delError } = await supabase.from('catalog_items').delete().eq('id', itemId);
  if (delError) {
    await supabase.from('catalog_items').update({
      is_available: false,
      metadata: { deleted: true, archived: true, deleted_at: new Date().toISOString() },
    }).eq('id', itemId);
  }

  return { success: true, deleted_id: itemId };
}

```

### lib/services/catalog/fetch-catalog.service.ts (39 lines)
```typescript
import { resolveBusinessId } from './resolve-business.util';
import { formatCatalogItems } from './catalog-formatter.util';

export async function fetchHostCatalog(requestUrl: string, supabase: any) {
  const resolvedBizId = await resolveBusinessId(requestUrl, supabase);

  const [catRes, menuRes, roomRes] = await Promise.all([
    supabase.from('catalog_items').select('*').eq('business_id', resolvedBizId).order('name', { ascending: true }),
    supabase.from('menu_items').select('*').or(`cafe_id.eq.${resolvedBizId},business_id.eq.${resolvedBizId}`).order('name', { ascending: true }),
    supabase.from('room_categories').select('id, name, addons, available_addons').eq('business_id', resolvedBizId),
  ]);

  const combinedCatalog: any[] = [...(catRes?.data || [])];
  const existingIds = new Set(combinedCatalog.map((i: any) => String(i.id)));
  const existingNames = new Set(combinedCatalog.map((i: any) => String(i.name || '').trim().toLowerCase()));

  if (menuRes?.data) {
    for (const mi of menuRes.data) {
      const normName = String(mi.name || '').trim().toLowerCase();
      if (!existingIds.has(String(mi.id)) && !existingNames.has(normName)) {
        existingIds.add(String(mi.id)); existingNames.add(normName);
        combinedCatalog.push({ ...mi, item_type: mi.item_type || 'food' });
      }
    }
  }

  const { allItems, categories } = formatCatalogItems(combinedCatalog, roomRes?.data || []);

  return {
    success: true,
    resolved_cafe_id: resolvedBizId,
    items: allItems,
    raw_count: allItems.length,
    categories,
    error: catRes?.error ? catRes.error.message : null,
  };
}


```

### lib/services/catalog/resolve-business.util.ts (37 lines)
```typescript
export async function resolveBusinessId(requestUrl: string, supabase: any): Promise<string> {
  const { searchParams } = new URL(requestUrl);
  const rawParam =
    searchParams.get('cafe_id') ||
    searchParams.get('venue') ||
    searchParams.get('business_id') ||
    searchParams.get('venue_id') ||
    searchParams.get('branchId');

  const uuidMatch = rawParam ? rawParam.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) : null;
  let bizId = uuidMatch ? uuidMatch[0] : rawParam && rawParam !== 'undefined' && rawParam !== 'null' ? rawParam.trim() : null;

  if (bizId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bizId)) {
    try {
      const { data: matched } = await supabase.from('businesses').select('id').ilike('name', `%${bizId}%`).limit(1).maybeSingle();
      if (matched) bizId = matched.id;
    } catch {}
  }

  if (!bizId) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data: b } = await supabase.from('businesses').select('id').eq('host_id', authData.user.id).maybeSingle();
        if (b) bizId = b.id;
      }
    } catch {}
  }

  if (!bizId) {
    const { data: fb } = await supabase.from('businesses').select('id').limit(1).maybeSingle();
    bizId = fb?.id || 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
  }

  return bizId || 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
}

```

### lib/services/guest-order.service.ts (7 lines)
```typescript
export * from './guest-order/order-utils';
export * from './guest-order/active-ticket.util';
export * from './guest-order/get-order.service';
export * from './guest-order/kot-generator.util';
export * from './guest-order/order-db-sync.util';
export * from './guest-order/submit-order.service';

```

### lib/services/guest-order/active-ticket.util.ts (38 lines)
```typescript
import { findKitchenTicketForTableOrOrder } from '@/lib/store/active-order-store';

export async function resolveLatestKitchenTicket(
  supabase: any,
  businessId: string,
  tableNumber: string,
  normTable: string,
  orderId?: string | null
) {
  let latestTicket: any = null;
  try {
    if (orderId) {
      const { data } = await supabase.from('kitchen_tickets').select('*')
        .eq('business_id', businessId).eq('order_id', orderId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data) latestTicket = data;
    }
    if (!latestTicket && !orderId) {
      const { data } = await supabase.from('kitchen_tickets').select('*')
        .eq('business_id', businessId)
        .or(`table_or_room.eq.${tableNumber},table_or_room.eq.Table ${tableNumber},table_or_room.eq.T-${normTable},table_or_room.ilike.%${tableNumber}%`)
        .in('status', ['PENDING', 'PREPARING', 'READY']).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data) latestTicket = data;
    }
  } catch {}

  const inMemTicket = findKitchenTicketForTableOrOrder(businessId, tableNumber, orderId);
  if (inMemTicket) {
    const isMatchingOrder = orderId ? inMemTicket.order_id === orderId : !['SERVED', 'CANCELLED', 'COMPLETED'].includes(inMemTicket.status);
    if (isMatchingOrder) {
      if (!latestTicket || new Date(inMemTicket.updated_at || inMemTicket.created_at).getTime() >= new Date(latestTicket.updated_at || latestTicket.created_at).getTime()) {
        latestTicket = inMemTicket;
      }
    }
  }

  return latestTicket;
}

```

### lib/services/guest-order/find-order.util.ts (28 lines)
```typescript
import { findActiveOrder } from '@/lib/store/active-order-store';
import { CLOSED_STATUSES } from './order-utils';

export async function lookupExistingOrder(supabase: any, bizId: string, rawTable: string, normTable: string) {
  let existingActiveOrder: any = null, previousRawItems: any[] = [];
  try {
    const { data: dbOrders } = await supabase.from('orders').select('*').eq('business_id', bizId)
      .or(`table_number.eq.${rawTable},table_number.eq.Table ${rawTable},table_number.eq.T-${normTable}`)
      .not('status', 'in', `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`).order('created_at', { ascending: false }).limit(1);

    if (dbOrders && dbOrders.length > 0) {
      existingActiveOrder = dbOrders[0];
      const { data: ordItems } = await supabase.from('order_items').select('*').eq('order_id', existingActiveOrder.id);
      previousRawItems = ordItems && ordItems.length > 0 ? ordItems : Array.isArray(existingActiveOrder.items) ? existingActiveOrder.items : [];
    }
  } catch {}

  if (!existingActiveOrder) {
    const inMem = findActiveOrder(bizId, rawTable) || findActiveOrder(bizId, normTable);
    if (inMem) {
      existingActiveOrder = inMem;
      previousRawItems = inMem.raw_items || inMem.items || [];
    }
  }

  return { existingActiveOrder, previousRawItems };
}

```

### lib/services/guest-order/get-order.service.ts (115 lines)
```typescript
import { aggregateOrderItems } from '@/lib/utils/qr-session';
import { findActiveOrder, findRecentSettledOrder } from '@/lib/store/active-order-store';
import { isValidUuid, CLOSED_STATUSES, normalizeCumulativeItems, buildTableOrFilter } from './order-utils';
import { resolveLatestKitchenTicket } from './active-ticket.util';

export async function getGuestActiveOrder(requestUrl: string, supabase: any) {
  const { searchParams } = new URL(requestUrl);
  const tableParamRaw = searchParams.get('table') || searchParams.get('table_number');
  const cafeParamRaw = searchParams.get('cafe_id') || searchParams.get('business_id');
  if (!tableParamRaw) throw new Error('Missing table parameter');

  const table_number = tableParamRaw.trim();
  const normTable = table_number.replace(/^(table|t-)\s*/i, '').trim().toUpperCase();
  const tableOr = buildTableOrFilter(table_number);
  const resolvedBizId: string = isValidUuid(cafeParamRaw) ? cafeParamRaw! : 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
  let activeOrder: any = null, items: any[] = [], isSettled = false, settledTotal = 0, isBillRequested = false;

  try {
    const { data: dbOrders } = await supabase.from('orders').select('*').eq('business_id', resolvedBizId)
      .or(tableOr)
      .not('status', 'in', `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`).order('created_at', { ascending: false }).limit(1);

    if (dbOrders && dbOrders.length > 0) {
      activeOrder = dbOrders[0];
      const { data: orderItems } = await supabase.from('order_items').select('*').eq('order_id', activeOrder.id).order('created_at', { ascending: true });
      items = orderItems && orderItems.length > 0 ? orderItems : Array.isArray(activeOrder.items) ? activeOrder.items : [];
    }
  } catch {}

  if (!activeOrder) {
    const inMem = findActiveOrder(resolvedBizId, table_number) || findActiveOrder(resolvedBizId, normTable);
    if (inMem && !['settled', 'cancelled', 'completed', 'billed', 'closed', 'paid'].includes((inMem.status || '').toLowerCase())) {
      activeOrder = inMem;
      items = inMem.raw_items || inMem.items || [];
      if ((inMem as any).bill_requested) isBillRequested = true;
    }
  }

  // Only check settled state if there is NO active order
  if (!activeOrder) {
    try {
      const { data: settledOrders } = await supabase
        .from('orders')
        .select('id, grand_total, total_amount, subtotal, status, created_at, session_id')
        .eq('business_id', resolvedBizId)
        .or(tableOr)
        .in('status', ['settled', 'SETTLED', 'completed', 'COMPLETED', 'paid', 'PAID'])
        .order('created_at', { ascending: false })
        .limit(10);

      const inMemSettled = findRecentSettledOrder(resolvedBizId, table_number) || findRecentSettledOrder(resolvedBizId, normTable);
      const memSettledAmount = Number(inMemSettled?.grand_total || inMemSettled?.total_amount || inMemSettled?.subtotal || 0);

      if (settledOrders && settledOrders.length > 0) {
        const latestTime = new Date(settledOrders[0].created_at).getTime();
        const ageMs = Date.now() - latestTime;
        if (ageMs < 2 * 60 * 60 * 1000) {
          const latestSessionId = settledOrders[0].session_id;
          const clusterOrders = settledOrders.filter((o: any) => {
            if (latestSessionId && o.session_id === latestSessionId) return true;
            return Math.abs(latestTime - new Date(o.created_at).getTime()) <= 30 * 60 * 1000;
          });
          const dbSum = clusterOrders.reduce((acc: number, o: any) => acc + (Number(o.grand_total || o.total_amount || o.subtotal) || 0), 0);
          const finalSettled = Math.max(dbSum, memSettledAmount);
          if (finalSettled > 0) {
            isSettled = true;
            settledTotal = finalSettled;
            activeOrder = settledOrders[0];
          }
        }
      } else if (memSettledAmount > 0) {
        isSettled = true;
        settledTotal = memSettledAmount;
        activeOrder = inMemSettled;
      }
    } catch {
      const inMemSettled = findRecentSettledOrder(resolvedBizId, table_number) || findRecentSettledOrder(resolvedBizId, normTable);
      const memAmount = Number(inMemSettled?.grand_total || inMemSettled?.total_amount || inMemSettled?.subtotal || 0);
      if (memAmount > 0) {
        isSettled = true;
        settledTotal = memAmount;
        activeOrder = inMemSettled;
      }
    }
  }

  try {
    const { data: dbSession } = await supabase.from('dine_in_sessions').select('id, status').eq('business_id', resolvedBizId)
      .or(`table_number.eq.${table_number},table_number.eq.Table ${table_number},table_number.eq.T-${normTable}`)
      .in('status', ['open', 'bill_requested']).order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (dbSession?.status === 'bill_requested') isBillRequested = true;
  } catch {}

  // Active orders strictly override any settlement
  if (activeOrder && !['settled', 'SETTLED', 'closed', 'CLOSED', 'completed', 'COMPLETED'].includes(activeOrder.status)) {
    isSettled = false;
    settledTotal = 0;
  } else if (settledTotal <= 0) {
    isSettled = false;
    settledTotal = 0;
  }

  const hasActive = Boolean(activeOrder) && !isSettled;
  const latestTicket = hasActive ? await resolveLatestKitchenTicket(supabase, resolvedBizId, table_number, normTable, activeOrder.id) : null;
  const normalizedItems = hasActive ? normalizeCumulativeItems(items) : [];
  const derivedKot = hasActive ? (latestTicket?.status ||
    (activeOrder?.status && ['preparing', 'ready', 'served'].includes(activeOrder.status.toLowerCase()) ? activeOrder.status.toUpperCase() : 'PENDING')) : null;

  return {
    success: true, has_active_order: hasActive, order: activeOrder, items: normalizedItems,
    aggregated: aggregateOrderItems(normalizedItems), kot_status: derivedKot,
    ticket: latestTicket, is_bill_requested: isBillRequested, is_settled: isSettled, settled_total: settledTotal,
  };
}

```

### lib/services/guest-order/kot-generator.util.ts (58 lines)
```typescript
import { randomUUID } from 'crypto';
import { addKitchenTicket, InMemKitchenTicket } from '@/lib/store/active-order-store';
import { isValidUuid } from './order-utils';

export async function createAndDispatchKotTicket(
  supabase: any,
  businessId: string,
  targetOrderId: string,
  rawTableNumber: string,
  isAddonOrder: boolean,
  newItemsFormatted: any[]
) {
  const ticketNumber = isAddonOrder
    ? `KOT-${Math.floor(1000 + Math.random() * 9000)}-ADD`
    : `KOT-${Math.floor(1000 + Math.random() * 9000)}`;

  const kotTicketId = randomUUID();
  const kotTicket: InMemKitchenTicket = {
    id: kotTicketId,
    business_id: businessId,
    order_id: targetOrderId,
    ticket_number: ticketNumber,
    table_or_room: isAddonOrder ? `${rawTableNumber} (Add-on KOT)` : rawTableNumber,
    items: newItemsFormatted.map((r: any) => ({
      name: r.item_name,
      qty: r.quantity,
      notes: r.notes || undefined,
      category: 'Food & Beverage',
      is_addon: isAddonOrder,
    })),
    status: 'PENDING',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  addKitchenTicket(kotTicket);

  try {
    if (isValidUuid(businessId)) {
      await supabase.from('kitchen_tickets').insert({
        id: kotTicketId,
        business_id: businessId,
        order_id: isValidUuid(targetOrderId) ? targetOrderId : null,
        ticket_number: ticketNumber,
        table_or_room: kotTicket.table_or_room,
        items: kotTicket.items,
        status: 'PENDING',
        created_at: kotTicket.created_at,
        updated_at: kotTicket.updated_at,
      });
    }
  } catch (kotErr) {
    console.warn('[Kitchen Ticket DB Insert Warning]:', kotErr);
  }

  return { ticketNumber, kotTicket };
}

```

### lib/services/guest-order/order-db-sync.util.ts (104 lines)
```typescript
import { isValidUuid } from './order-utils';

export async function syncOrderToDatabase(
  supabase: any,
  resolvedBizId: string,
  targetOrderId: string,
  rawTableNumber: string,
  normTable: string,
  isAddonOrder: boolean,
  incomingItems: any[],
  aggregatedForBill: any[],
  totals: any,
  guestName?: string | null,
  guestPhone?: string | null,
  guestHandle?: string | null
) {
  if (!isValidUuid(targetOrderId)) return;
  try {
    const dbOrderItems = incomingItems.map((item: any) => ({
      order_id: targetOrderId,
      business_id: resolvedBizId,
      item_id: item.item_id ? String(item.item_id) : (item.id ? String(item.id) : null),
      item_name: item.name || item.title || 'Curated Dish',
      price: Number(item.price ?? item.unit_price ?? item.total_item_price ?? 0),
      quantity: Math.max(1, Number(item.quantity ?? item.qty ?? 1)),
      notes: item.notes || null,
      kot_status: 'pending',
      created_at: new Date().toISOString(),
    }));

    // SSOT: orders.session_id is the FK linking an order to dine_in_sessions.
    // Resolve the active session_id for this table to populate the FK correctly.
    let resolvedSessionId: string | null = null;
    try {
      const { data: sess } = await supabase
        .from('dine_in_sessions')
        .select('id')
        .eq('business_id', resolvedBizId)
        .or(`table_number.eq.${rawTableNumber},table_number.eq.Table ${rawTableNumber},table_number.eq.T-${normTable}`)
        .in('status', ['open', 'bill_requested'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sess?.id && isValidUuid(sess.id)) resolvedSessionId = sess.id;
    } catch {}

    if (isAddonOrder) {
      await supabase.from('order_items').insert(dbOrderItems);
      await supabase.from('orders').update({
        items: aggregatedForBill, subtotal: totals.subtotal, tax_amount: totals.taxAmount,
        grand_total: totals.grandTotal, total_amount: totals.grandTotal,
        ...(resolvedSessionId ? { session_id: resolvedSessionId } : {}),
      }).eq('id', targetOrderId);
    } else {
      await supabase.from('orders').insert({
        id: targetOrderId,
        business_id: resolvedBizId,
        table_number: rawTableNumber,
        order_source: 'QR_GUEST',
        order_type: 'pos',
        status: 'open',
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        grand_total: totals.grandTotal,
        total_amount: totals.grandTotal,
        items: aggregatedForBill,
        customer_name: guestName || (guestHandle ? `Guest (${guestHandle})` : null),
        customer_phone: guestPhone || null,
        // SSOT FK: orders.session_id → dine_in_sessions.id
        session_id: resolvedSessionId,
        created_at: new Date().toISOString(),
      });
      await supabase.from('order_items').insert(dbOrderItems);
    }

    // Update dine_in_sessions to signal activity, keep status open, and link guest profile
    const sessionUpdatePayload: any = { status: 'open', updated_at: new Date().toISOString() };
    if (guestHandle) sessionUpdatePayload.guest_handle = guestHandle;
    if (guestName) sessionUpdatePayload.guest_name = guestName;
    if (guestPhone) sessionUpdatePayload.customer_phone = guestPhone;

    if (resolvedSessionId) {
      await supabase.from('dine_in_sessions').update(sessionUpdatePayload).eq('id', resolvedSessionId);
    } else {
      await supabase.from('dine_in_sessions').update(sessionUpdatePayload)
        .eq('business_id', resolvedBizId)
        .or(`table_number.eq.${rawTableNumber},table_number.eq.Table ${rawTableNumber},table_number.eq.T-${normTable}`);
    }

    try {
      const { recentSettledOrders, getTableKey } = await import('@/lib/store/active-order-store');
      recentSettledOrders.delete(getTableKey(resolvedBizId, rawTableNumber));
      recentSettledOrders.delete(getTableKey(resolvedBizId, normTable));
    } catch {}

    await supabase.from('restaurant_tables').update({ status: 'OCCUPIED' }).eq('business_id', resolvedBizId)
      .or(`table_number.eq.${rawTableNumber},table_number.eq.Table ${rawTableNumber},table_number.eq.T-${normTable}`);

    // 7% Cashback is exclusively credited upon bill settlement (in settle-session.service.ts)
  } catch (dbErr) {
    console.error('[Order DB Insert Warning]:', dbErr);
  }
}

```

### lib/services/guest-order/order-utils.ts (42 lines)
```typescript
export const isValidUuid = (val?: string | null): boolean => {
  return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

export const CLOSED_STATUSES = ['SETTLED', 'settled', 'COMPLETED', 'completed', 'CANCELLED', 'cancelled', 'billed'];

export function normalizeCumulativeItems(cumulativeRawItems: any[]) {
  return (cumulativeRawItems || []).map((it: any, idx: number) => {
    const name = it.item_name || it.name || it.title || 'Curated Dish';
    const quantity = Math.max(1, Number(it.quantity ?? it.qty ?? 1) || 1);
    const price = Number(it.price ?? it.unit_price ?? it.total_item_price ?? 0) || 0;

    return {
      id: it.id || `item_${idx}`,
      item_id: it.item_id || it.id || null,
      name,
      item_name: name,
      price,
      quantity,
      qty: quantity,
      total_price: price * quantity,
      notes: it.notes || null,
      kot_status: it.kot_status || 'pending',
      created_at: it.created_at || new Date().toISOString(),
    };
  });
}

export function getTableVariants(rawTable: string): string[] {
  if (!rawTable) return [];
  const raw = rawTable.trim();
  const norm = raw.replace(/\s*\([^)]*\)/g, '').replace(/^table\s*/i, '').replace(/^t-/i, '').trim().toUpperCase();
  const unpad = norm.replace(/^0+/, '') || norm;
  const pad = norm.length === 1 ? `0${norm}` : norm;
  const set = new Set<string>([raw, norm, unpad, pad, `T-${norm}`, `T-${unpad}`, `T-${pad}`, `Table ${norm}`, `Table ${unpad}`, `Table ${pad}`, `Table ${raw}`]);
  return Array.from(set).filter(Boolean);
}

export function buildTableOrFilter(rawTable: string, col = 'table_number'): string {
  return getTableVariants(rawTable).map((v) => `${col}.eq.${v}`).join(',');
}

```

### lib/services/guest-order/submit-order.service.ts (52 lines)
```typescript
import { randomUUID } from 'crypto';
import { calculateOrderTotals, aggregateOrderItems } from '@/lib/utils/qr-session';
import { saveActiveOrder, ActiveOrderRecord } from '@/lib/store/active-order-store';
import { isValidUuid } from './order-utils';
import { lookupExistingOrder } from './find-order.util';
import { createAndDispatchKotTicket } from './kot-generator.util';
import { syncOrderToDatabase } from './order-db-sync.util';

export async function submitGuestOrder(body: any, supabase: any) {
  const { business_id, cafe_id, table_number, guest_name, guest_phone, guest_handle, items: incomingItems = [] } = body;
  const rawTableNumber = (table_number || '').trim();
  if (!rawTableNumber) throw new Error('Missing table_number');
  if (!Array.isArray(incomingItems) || incomingItems.length === 0) throw new Error('No items in order');

  const normTable = rawTableNumber.replace(/^(table|t-)\s*/i, '').trim().toUpperCase();
  const resolvedBizId: string = isValidUuid(business_id) ? business_id! : isValidUuid(cafe_id) ? cafe_id! : 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';

  const { existingActiveOrder, previousRawItems } = await lookupExistingOrder(supabase, resolvedBizId, rawTableNumber, normTable);
  const isAddonOrder = Boolean(existingActiveOrder);
  const targetOrderId = isValidUuid(existingActiveOrder?.id) ? existingActiveOrder.id : randomUUID();

  const newItemsFormatted = incomingItems.map((item: any, idx: number) => ({
    id: `item_${Date.now()}_${idx}`, order_id: targetOrderId, item_id: item.item_id || item.id || null,
    item_name: item.name || item.title || 'Curated Dish', name: item.name || item.title || 'Curated Dish',
    price: Number(item.price ?? item.unit_price ?? item.total_item_price ?? 0), quantity: Number(item.quantity ?? item.qty ?? 1),
    total_price: Number(item.price ?? item.unit_price ?? item.total_item_price ?? 0) * Number(item.quantity ?? item.qty ?? 1),
    notes: item.notes || null, kot_status: 'pending', is_addon: isAddonOrder, created_at: new Date().toISOString(),
  }));

  const cumulativeRawItems = [...previousRawItems, ...newItemsFormatted];
  const aggregatedForBill = aggregateOrderItems(cumulativeRawItems);
  const totals = calculateOrderTotals(cumulativeRawItems);

  const masterOrderRecord: ActiveOrderRecord = {
    id: targetOrderId, business_id: resolvedBizId, table_number: rawTableNumber, status: 'open',
    subtotal: totals.subtotal, tax_amount: totals.taxAmount, grand_total: totals.grandTotal, total_amount: totals.grandTotal,
    customer_name: guest_name || (guest_handle ? `Guest (${guest_handle})` : existingActiveOrder?.customer_name || 'Guest'), customer_phone: guest_phone || existingActiveOrder?.customer_phone || null,
    items: aggregatedForBill, raw_items: cumulativeRawItems, created_at: existingActiveOrder?.created_at || new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  saveActiveOrder(masterOrderRecord);

  await syncOrderToDatabase(supabase, resolvedBizId, targetOrderId, rawTableNumber, normTable, isAddonOrder, incomingItems, aggregatedForBill, totals, guest_name, guest_phone, guest_handle);
  const { ticketNumber } = await createAndDispatchKotTicket(supabase, resolvedBizId, targetOrderId, rawTableNumber, isAddonOrder, newItemsFormatted);

  return {
    success: true, is_addon: isAddonOrder, order_id: targetOrderId, ticket_number: ticketNumber, kot_status: 'PENDING',
    order: masterOrderRecord, subtotal: totals.subtotal, tax_amount: totals.taxAmount, grand_total: totals.grandTotal, total_amount: totals.grandTotal, items: masterOrderRecord.items,
  };
}

export const placeGuestOrder = submitGuestOrder;

```

### lib/services/guest-session.service.ts (9 lines)
```typescript
export * from './guest-session/session-utils';
export * from './guest-session/session-kot.util';
export * from './guest-session/init-session-helpers.util';
export * from './guest-session/guest-record.util';
export * from './guest-session/init-session.service';
export * from './guest-session/get-session.service';
export * from './guest-session/bill-request-event.util';
export * from './guest-session/update-session.service';

```

### lib/services/guest-session/bill-request-event.util.ts (57 lines)
```typescript
import { isValidUuid } from './session-utils';

export async function processBillRequestEvent(
  supabase: any,
  updatedSession: any,
  sessionId: string,
  resolvedBizId: string,
  rawTable: string,
  normTable: string,
  nowIso: string
) {
  let runningTotal = 0, itemCount = 0;

  try {
    const { findActiveOrder, saveActiveOrder, recordBillRequestEvent } = await import('@/lib/store/active-order-store');
    const inMem = findActiveOrder(resolvedBizId, rawTable || normTable);
    if (inMem) {
      (inMem as any).bill_requested = true;
      inMem.updated_at = nowIso;
      saveActiveOrder(inMem);
      runningTotal = Number(inMem.grand_total || inMem.subtotal || 0);
      itemCount = Array.isArray(inMem.items) ? inMem.items.length : 0;
    }

    recordBillRequestEvent({
      id: `br_${Date.now()}`, session_id: updatedSession?.id || sessionId || null,
      business_id: resolvedBizId, table_number: rawTable || normTable || '01',
      requested_at: nowIso, item_count: itemCount, running_total: runningTotal, session_status: 'bill_requested',
    });
  } catch {}

  try {
    let orderQuery = supabase.from('orders').select('id, items, subtotal, grand_total, total_amount')
      .not('status', 'in', '("settled","SETTLED","completed","COMPLETED","cancelled","CANCELLED","billed")')
      .order('created_at', { ascending: false }).limit(1);

    if (isValidUuid(updatedSession?.id)) orderQuery = orderQuery.eq('session_id', updatedSession.id);
    else if (rawTable) orderQuery = orderQuery.eq('business_id', resolvedBizId).or(`table_number.eq.${rawTable},table_number.eq.Table ${rawTable},table_number.eq.T-${normTable}`);

    const { data: order } = await orderQuery.maybeSingle();
    if (order) {
      runningTotal = Number(order.grand_total || order.total_amount || order.subtotal || runningTotal);
      if (Array.isArray(order.items) && order.items.length > 0) itemCount = order.items.length;
    }

    if (isValidUuid(updatedSession?.id)) {
      await supabase.from('bill_request_events').insert({
        business_id: updatedSession.business_id || resolvedBizId, session_id: updatedSession.id,
        table_id: updatedSession.table_id || null, guest_session_id: updatedSession.guest_session_id || null,
        table_number: rawTable || updatedSession.table_number, requested_at: nowIso, item_count: itemCount, running_total: runningTotal,
      });
    }
  } catch (error) {
    console.error('[Bill Request History]', error);
  }
}

```

### lib/services/guest-session/get-session.service.ts (56 lines)
```typescript
import { isValidUuid, normalizeTable, buildTableOrFilter } from './session-utils';
import { resolveSessionKotStatus } from './session-kot.util';

export async function getGuestSession(requestUrl: string, supabase: any) {
  const { searchParams } = new URL(requestUrl);
  const sessionId = searchParams.get('session_id');
  if (!sessionId) throw new Error('Missing session_id');

  const rawT = (searchParams.get('table_number') || '').trim(), normT = normalizeTable(rawT);
  const tableOr = rawT ? buildTableOrFilter(rawT) : '';

  let guestData: any = null;
  try {
    const { data } = await supabase.from('guest_sessions').select('*').eq('session_id', sessionId).maybeSingle();
    if (data) guestData = data;
  } catch {}

  let dineInSessionId = null, sessionStatus: string | null = null;
  if (normT && tableOr) {
    try {
      const { data: s } = await supabase.from('dine_in_sessions').select('id, status, table_number')
        .or(tableOr).in('status', ['open', 'bill_requested']).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (s) { dineInSessionId = s.id; sessionStatus = s.status; }
    } catch {}
  }

  if (!sessionStatus && isValidUuid(sessionId)) {
    try {
      const { data: byId } = await supabase.from('dine_in_sessions').select('id, status, table_number').eq('id', sessionId).maybeSingle();
      if (byId && (!normT || normalizeTable(byId.table_number) === normT)) { dineInSessionId = byId.id; sessionStatus = byId.status; }
    } catch {}
  }

  if (!sessionStatus && sessionId) {
    try {
      let q = supabase.from('dine_in_sessions').select('id, status, table_number').eq('guest_session_id', sessionId);
      if (normT && tableOr) q = q.or(tableOr);
      const { data: byGuestId } = await q.order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (byGuestId && (!normT || normalizeTable(byGuestId.table_number) === normT)) { dineInSessionId = byGuestId.id; sessionStatus = byGuestId.status; }
    } catch {}
  }


  let settledTotal = 0;
  if (sessionStatus === 'closed' && dineInSessionId) {
    try {
      const { data: order } = await supabase.from('orders').select('grand_total, total_amount').eq('session_id', dineInSessionId).order('updated_at', { ascending: false }).limit(1).maybeSingle();
      settledTotal = Number(order?.grand_total || order?.total_amount) || 0;
    } catch {}
  }

  const { kotStatus, ticketNumber } = await resolveSessionKotStatus(supabase, rawT, normT, dineInSessionId);

  return { success: true, guest: guestData, table_number: rawT, dine_in_session_id: dineInSessionId, session_status: sessionStatus || 'open', settled_total: settledTotal, kot_status: kotStatus, ticket_number: ticketNumber };
}

```

### lib/services/guest-session/guest-record.util.ts (24 lines)
```typescript
import { isValidUuid } from './session-utils';

export async function upsertGuestRecord(
  supabase: any,
  activeSessionId?: string | null,
  guestSessionId?: string,
  guestName?: string,
  avatar?: string,
  resolvedTableId?: string | null,
  tableNumber?: string
) {
  let guestRecord: any = null;
  if (guestSessionId && isValidUuid(activeSessionId)) {
    try {
      const { data: gsData } = await supabase.from('guest_sessions').upsert({
        session_id: guestSessionId, dine_in_session_id: activeSessionId, guest_name: guestName || 'Guest',
        avatar: avatar || '☕', status: 'active', last_active_at: new Date().toISOString(),
      }, { onConflict: 'session_id' }).select().maybeSingle();
      if (gsData) guestRecord = gsData;
    } catch {}
  }
  return guestRecord || { session_id: guestSessionId, table_id: resolvedTableId, table_number: tableNumber, guest_name: guestName || 'Guest', avatar: avatar || '☕', status: 'active' };
}

```

### lib/services/guest-session/init-session-helpers.util.ts (51 lines)
```typescript
import { isValidUuid, buildTableOrFilter } from './session-utils';

export async function resolveTableAndBusiness(supabase: any, tableId?: string | null, tableNumber?: string | null, businessId?: string | null) {
  let targetBizId = isValidUuid(businessId) ? businessId : null;
  let resolvedTableId = isValidUuid(tableId) ? tableId : null;
  try {
    if (!targetBizId || !resolvedTableId) {
      const tableOr = tableNumber ? buildTableOrFilter(tableNumber) : '';
      let q = supabase.from('restaurant_tables').select('id, business_id, table_number');
      if (tableOr) q = q.or(tableOr);
      const { data: t } = await q.limit(1).maybeSingle();
      if (t) { resolvedTableId = isValidUuid(t.id) ? t.id : resolvedTableId; targetBizId = isValidUuid(t.business_id) ? t.business_id : targetBizId; }
    }
    if (!targetBizId) {
      const { data: biz } = await supabase.from('businesses').select('id').limit(1).maybeSingle();
      if (biz && isValidUuid(biz.id)) targetBizId = biz.id;
    }
  } catch {}
  return { targetBizId, resolvedTableId };
}

export async function resolveOrInitMasterOrder(supabase: any, activeSession: any, targetBizId?: string | null, tableNumber?: string | null, resolvedTableId?: string | null) {
  let masterOrder: any = null;
  const closedIn = '("settled","SETTLED","completed","COMPLETED","cancelled","CANCELLED","billed","BILLED","closed","CLOSED","paid","PAID")';
  try {
    if (isValidUuid(activeSession?.id)) {
      const { data: o } = await supabase.from('orders').select('*').eq('session_id', activeSession.id)
        .not('status', 'in', closedIn).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (o && (Number(o.grand_total || o.subtotal || 0) > 0 || (Array.isArray(o.items) && o.items.length > 0))) masterOrder = o;
    }

    if (!masterOrder && targetBizId && tableNumber) {
      const tableOr = buildTableOrFilter(tableNumber);
      const { data: activeTableOrders } = await supabase.from('orders').select('*').eq('business_id', targetBizId)
        .or(tableOr).not('status', 'in', closedIn).order('created_at', { ascending: false }).limit(1);

      if (activeTableOrders && activeTableOrders.length > 0) {
        const candidate = activeTableOrders[0];
        if (Number(candidate.grand_total || candidate.subtotal || 0) > 0 || (Array.isArray(candidate.items) && candidate.items.length > 0)) {
          masterOrder = candidate;
          if (isValidUuid(activeSession?.id) && !masterOrder.session_id) {
            await supabase.from('orders').update({ session_id: activeSession.id }).eq('id', masterOrder.id);
          }
        }
      }
    }
  } catch {}
  return masterOrder;
}


```

### lib/services/guest-session/init-session.service.ts (120 lines)
```typescript
import { isValidUuid, buildTableOrFilter } from './session-utils';
import { resolveTableAndBusiness, resolveOrInitMasterOrder } from './init-session-helpers.util';
import { upsertGuestRecord } from './guest-record.util';
export async function initializeGuestSession(bodyOrTable: any, clientOrBiz?: any) {
  const isDirect = typeof bodyOrTable === 'string';
  const supabase = (!isDirect && clientOrBiz) ? clientOrBiz : (await import('@/lib/supabase/client')).createClient();
  const rawBody = isDirect ? { table_id: bodyOrTable, business_id: clientOrBiz, guest_session_id: `GS-${Math.random().toString(36).substring(2, 9).toUpperCase()}` } : bodyOrTable;
  const { table_id, table_number, guest_session_id, business_id, guest_name, guest_handle, customer_phone, avatar } = rawBody;
  if (!table_number && !table_id) throw new Error('Missing table identifier or guest_session_id');
  const { targetBizId, resolvedTableId } = await resolveTableAndBusiness(supabase, table_id, table_number || 'Unknown', business_id);
  let activeSession: any = null;
  try {
    let q = supabase.from('dine_in_sessions').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(1);
    q = resolvedTableId ? q.eq('table_id', resolvedTableId) : table_number ? q.eq('table_number', table_number) : q;
    if (targetBizId) q = q.eq('business_id', targetBizId);
    const { data: s } = await q.maybeSingle();
    if (s) {
      activeSession = s;
      if (guest_handle && (!s.guest_handle || s.guest_handle !== guest_handle)) {
        supabase.from('dine_in_sessions').update({ guest_handle, guest_name: guest_name || s.guest_name, customer_phone: customer_phone || s.customer_phone }).eq('id', s.id).catch?.(() => {});
      }
    }
  } catch {}

  if (!activeSession && (targetBizId || resolvedTableId)) {
    try {
      const { data: td } = resolvedTableId ? await supabase.from('restaurant_tables').select('table_number').eq('id', resolvedTableId).maybeSingle() : { data: null };
      const tNum = table_number || td?.table_number || 'Unknown';
      const { data: n } = await supabase.from('dine_in_sessions').insert({
        business_id: targetBizId, table_id: resolvedTableId, table_number: tNum,
        guest_session_id: guest_session_id || `GS-${Date.now()}`, status: 'open',
        guest_handle: guest_handle || null,
        guest_name: guest_name || null,
        customer_phone: customer_phone || null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).select().single();
      if (n) activeSession = n;
    } catch {}
  }

  if (!activeSession) {
    activeSession = { id: `sess-${Date.now()}`, business_id: targetBizId || 'demo-biz', table_id: resolvedTableId, table_number: table_number || 'Unknown', guest_session_id, guest_handle, status: 'open' };
  }
  if (isDirect) return activeSession;

  const masterOrder = await resolveOrInitMasterOrder(supabase, activeSession, targetBizId, table_number, resolvedTableId);
  let orderItems: any[] = [];
  try {
    if (masterOrder && isValidUuid(masterOrder.id)) {
      const { data: items } = await supabase.from('order_items').select('*').eq('order_id', masterOrder.id);
      orderItems = items?.length ? items : Array.isArray(masterOrder.items) ? masterOrder.items : [];
    } else if (masterOrder && Array.isArray(masterOrder.items)) orderItems = masterOrder.items;
  } catch {}

  const guestRecord = await upsertGuestRecord(supabase, activeSession?.id, guest_session_id, guest_name, avatar, resolvedTableId, table_number);
  let kotStatus = null, ticketNumber = null;
  try {
    if (masterOrder?.id) {
      const { findKitchenTicketForTableOrOrder } = await import('@/lib/store/active-order-store');
      const inMemKt = findKitchenTicketForTableOrOrder(targetBizId, table_number, masterOrder.id);
      if (inMemKt) { kotStatus = inMemKt.status; ticketNumber = inMemKt.ticket_number; }
    }
  } catch {}

  let isSettled = false, settledTotal = 0;
  if (!masterOrder && targetBizId) {
    try {
      const { findRecentSettledOrder } = await import('@/lib/store/active-order-store');
      const inMemSettled = findRecentSettledOrder(targetBizId, table_number);
      const memSettledAmount = Number(inMemSettled?.grand_total || inMemSettled?.total_amount || inMemSettled?.subtotal || 0);

      const tableVariants = table_number ? buildTableOrFilter(table_number) : '';
      const orFilter = [resolvedTableId ? `table_id.eq.${resolvedTableId}` : '', tableVariants].filter(Boolean).join(',');
      let q = supabase.from('orders').select('id, grand_total, total_amount, subtotal, status, created_at, session_id')
        .eq('business_id', targetBizId).in('status', ['settled', 'SETTLED', 'completed', 'COMPLETED', 'paid', 'PAID'])
        .order('created_at', { ascending: false }).limit(10);
      if (orFilter) q = q.or(orFilter);
      const { data: settledOrders } = await q;

      if (settledOrders && settledOrders.length > 0) {
        const latestTime = new Date(settledOrders[0].created_at).getTime();
        const ageMs = Date.now() - latestTime;
        if (ageMs < 2 * 60 * 60 * 1000) {
          const latestSessionId = settledOrders[0].session_id;
          const clusterOrders = settledOrders.filter((o: any) => {
            if (latestSessionId && o.session_id === latestSessionId) return true;
            return Math.abs(latestTime - new Date(o.created_at).getTime()) <= 30 * 60 * 1000;
          });
          const dbSum = clusterOrders.reduce((acc: number, o: any) => acc + (Number(o.grand_total || o.total_amount || o.subtotal) || 0), 0);
          const finalSettled = Math.max(dbSum, memSettledAmount);
          if (finalSettled > 0) {
            isSettled = true;
            settledTotal = finalSettled;
          }
        }
      } else if (memSettledAmount > 0) {
        isSettled = true;
        settledTotal = memSettledAmount;
      }
    } catch {}
  }

  if (masterOrder || settledTotal <= 0) {
    isSettled = false;
    settledTotal = 0;
  }

  return {
    success: true,
    session: activeSession,
    guest: guestRecord,
    order: masterOrder,
    items: orderItems,
    kot_status: kotStatus,
    ticket_number: ticketNumber,
    is_settled: isSettled,
    settled_total: settledTotal,
  };
}

```

### lib/services/guest-session/session-kot.util.ts (29 lines)
```typescript
export async function resolveSessionKotStatus(supabase: any, rawT: string, normT: string, dineInSessionId: string | null) {
  let kotStatus = null, ticketNumber = null;
  if (!dineInSessionId) return { kotStatus, ticketNumber };

  try {
    const closedIn = '("settled","SETTLED","completed","COMPLETED","cancelled","CANCELLED","closed","CLOSED","paid","PAID")';
    const { data: order } = await supabase.from('orders').select('id, status').eq('session_id', dineInSessionId)
      .not('status', 'in', closedIn).order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (order?.id) {
      const { data: kt } = await supabase.from('kitchen_tickets').select('ticket_number, status')
        .eq('order_id', order.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (kt) { kotStatus = kt.status; ticketNumber = kt.ticket_number; }
    }
  } catch {}

  if (!kotStatus && dineInSessionId) {
    try {
      const { findKitchenTicketForTableOrOrder } = await import('@/lib/store/active-order-store');
      const inMemKt = findKitchenTicketForTableOrOrder(null, rawT);
      if (inMemKt && !['SERVED', 'CANCELLED', 'COMPLETED'].includes(inMemKt.status)) {
        kotStatus = inMemKt.status; ticketNumber = inMemKt.ticket_number;
      }
    } catch {}
  }

  return { kotStatus, ticketNumber };
}

```

### lib/services/guest-session/session-utils.ts (27 lines)
```typescript
export const isValidUuid = (val?: string | null): boolean => {
  return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

export const normalizeTable = (t: string) => {
  return (t || '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^table\s*/i, '')
    .replace(/^t-/i, '')
    .trim()
    .toUpperCase();
};

export function getTableVariants(rawTable: string): string[] {
  if (!rawTable) return [];
  const raw = rawTable.trim(), norm = normalizeTable(raw);
  const unpad = norm.replace(/^0+/, '') || norm;
  const pad = norm.length === 1 ? `0${norm}` : norm;
  const set = new Set<string>([raw, norm, unpad, pad, `T-${norm}`, `T-${unpad}`, `T-${pad}`, `Table ${norm}`, `Table ${unpad}`, `Table ${pad}`, `Table ${raw}`]);
  return Array.from(set).filter(Boolean);
}

export function buildTableOrFilter(rawTable: string, col = 'table_number'): string {
  return getTableVariants(rawTable).map((v) => `${col}.eq.${v}`).join(',');
}


```

### lib/services/guest-session/update-session.service.ts (50 lines)
```typescript
import { isValidUuid, normalizeTable } from './session-utils';
import { processBillRequestEvent } from './bill-request-event.util';

export async function updateGuestSession(body: any, supabase: any) {
  const { session_id, table_number, business_id, cafe_id, action, status } = body;
  const targetStatus = action === 'request_bill' || status === 'bill_requested' ? 'bill_requested' : status || 'open';
  const rawTable = (table_number || '').trim();
  const normTable = normalizeTable(rawTable);
  const nowIso = new Date().toISOString();
  const resolvedBizId = isValidUuid(business_id) ? business_id : isValidUuid(cafe_id) ? cafe_id : 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';

  let updatedSession: any = null;

  if (isValidUuid(session_id)) {
    try {
      const { data: updated } = await supabase.from('dine_in_sessions').update({ status: targetStatus, updated_at: nowIso }).eq('id', session_id).select().maybeSingle();
      if (updated) updatedSession = updated;
    } catch {}
  }

  if (!updatedSession && rawTable) {
    try {
      const { data: updated } = await supabase.from('dine_in_sessions').update({ status: targetStatus, updated_at: nowIso })
        .eq('business_id', resolvedBizId).or(`table_number.eq.${rawTable},table_number.eq.Table ${rawTable},table_number.eq.T-${normTable}`)
        .in('status', ['open', 'bill_requested']).select().maybeSingle();
      if (updated) updatedSession = updated;
    } catch {}
  }

  if (!updatedSession && targetStatus === 'bill_requested' && rawTable) {
    try {
      const { data: newSess } = await supabase.from('dine_in_sessions').insert({
        business_id: resolvedBizId, table_number: rawTable, guest_session_id: session_id || `gst_${Date.now()}`,
        status: 'bill_requested', created_at: nowIso, updated_at: nowIso,
      }).select().maybeSingle();
      if (newSess) updatedSession = newSess;
    } catch {}
  }

  if (targetStatus === 'bill_requested') {
    await processBillRequestEvent(supabase, updatedSession, session_id, resolvedBizId, rawTable, normTable, nowIso);
  }

  return {
    success: true,
    status: targetStatus,
    session: updatedSession || { id: session_id, table_number: rawTable, status: targetStatus },
  };
}

```

### lib/services/inventory/recipe-deduction.service.ts (74 lines)
```typescript
// lib/services/inventory/recipe-deduction.service.ts

export async function deductInventoryForOrder(supabase: any, orderId: string, businessId: string) {
  if (!orderId || !businessId) return { success: false, reason: 'Missing orderId or businessId' };

  try {
    if (supabase && typeof supabase.rpc === 'function') {
      const { data, error } = await supabase.rpc('deduct_recipe_inventory_for_order', {
        p_order_id: orderId,
      });
      if (!error && data?.success) {
        return { success: true, ...data };
      }
    }
  } catch (rpcErr) {
    console.warn('[Recipe Inventory RPC Note]:', rpcErr);
  }

  // Graceful fallback if RPC or DB table is offline/mock
  try {
    if (supabase) {
      const { data: items } = await supabase
        .from('order_items')
        .select('item_id, quantity')
        .eq('order_id', orderId);

      if (items && items.length > 0) {
        for (const it of items) {
          if (!it.item_id) continue;
          const { data: recipes } = await supabase
            .from('recipe_ingredients')
            .select('raw_item_id, quantity_required')
            .eq('catalog_item_id', it.item_id);

          if (recipes && recipes.length > 0) {
            for (const r of recipes) {
              const qty = Number(r.quantity_required || 0) * Number(it.quantity || 1);
              if (qty > 0 && r.raw_item_id) {
                const { data: rawItem } = await supabase
                  .from('raw_inventory_items')
                  .select('current_stock, threshold, item_name, unit')
                  .eq('id', r.raw_item_id)
                  .maybeSingle();

                if (rawItem) {
                  const newStock = Math.max(0, Number(rawItem.current_stock || 0) - qty);
                  await supabase
                    .from('raw_inventory_items')
                    .update({ current_stock: newStock, updated_at: new Date().toISOString() })
                    .eq('id', r.raw_item_id);

                  if (newStock <= Number(rawItem.threshold || 5)) {
                    await supabase.from('staff_notifications').insert({
                      business_id: businessId,
                      notification_type: 'LOW_STOCK_ALERT',
                      message: `Low Stock: ${rawItem.item_name} at ${newStock} ${rawItem.unit || 'units'}`,
                      status: 'PENDING',
                      created_at: new Date().toISOString(),
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Recipe Inventory Fallback Note]:', err);
  }

  return { success: true, order_id: orderId };
}

```

### lib/services/kitchen.service.ts (5 lines)
```typescript
export * from './kitchen/business-resolver.service';
export * from './kitchen/get-tickets.service';
export * from './kitchen/update-ticket.service';
export * from './kitchen/create-ticket.service';

```

### lib/services/kitchen/business-resolver.service.ts (49 lines)
```typescript
import { cookies } from 'next/headers';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let cachedBizId: string | null = null;
let cacheExpiry = 0;

export async function resolveKitchenBusinessId(
  supabase: any,
  request: Request
): Promise<string | null> {
  const url = new URL(request.url);
  const paramId = url.searchParams.get('business_id') || url.searchParams.get('cafe_id');
  if (paramId && UUID_REGEX.test(paramId)) return paramId;

  const headerId = request.headers.get('x-business-id');
  if (headerId && UUID_REGEX.test(headerId)) return headerId;

  const now = Date.now();
  if (cachedBizId && now < cacheExpiry) return cachedBizId;

  const cookieStore = cookies();
  const hasAuthCookie = cookieStore.getAll().some((c) => c.name.startsWith('sb-'));

  if (hasAuthCookie) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: biz } = await supabase.from('businesses').select('id').eq('host_id', user.id).single();
        if (biz?.id) {
          cachedBizId = biz.id;
          cacheExpiry = now + 600000;
          return biz.id;
        }
      }
    } catch {}
  }

  try {
    const { data: fallbackBiz } = await supabase.from('businesses').select('id').limit(1).single();
    if (fallbackBiz?.id) {
      cachedBizId = fallbackBiz.id;
      cacheExpiry = now + 600000;
      return fallbackBiz.id;
    }
  } catch {}

  return null;
}

```

### lib/services/kitchen/create-ticket.service.ts (37 lines)
```typescript
import { addKitchenTicket } from '@/lib/store/active-order-store';

export async function createKitchenTicketRecord(
  supabase: any,
  businessId: string,
  body: any
) {
  const { items, tableOrRoom, orderId, roomId } = body;
  if (!items || !items.length) throw new Error('No items provided');

  const validItems = items.filter((item: any) => item.name && item.qty);
  if (validItems.length === 0) return { success: true, message: 'No kitchen items to dispatch.' };

  const ticketNumber = `KOT-${Math.floor(1000 + Math.random() * 9000)}`;
  const newTicket = {
    business_id: businessId,
    order_id: orderId || null,
    room_id: roomId || null,
    ticket_number: ticketNumber,
    table_or_room: tableOrRoom || 'Counter / Takeaway',
    items: validItems,
    status: 'PENDING',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: ticket, error } = await supabase
    .from('kitchen_tickets')
    .insert(newTicket)
    .select()
    .single();

  if (error) throw error;
  if (ticket) addKitchenTicket(ticket as any);
  return { ticket };
}

```

### lib/services/kitchen/get-tickets.service.ts (58 lines)
```typescript
import { getKitchenTickets } from '@/lib/store/active-order-store';
import type { KitchenTicket } from '@/lib/utils/kitchen';

let serverTicketCache: { businessId: string; tickets: any[]; expiry: number } | null = null;

export function invalidateKitchenTicketsCache() {
  serverTicketCache = null;
}

export async function fetchKitchenTickets(
  supabase: any,
  businessId: string,
  statusFilter: string | null
): Promise<KitchenTicket[]> {
  const now = Date.now();
  let dbTickets: any[] = [];

  if (serverTicketCache && serverTicketCache.businessId === businessId && now < serverTicketCache.expiry) {
    dbTickets = serverTicketCache.tickets;
  } else {
    let query = supabase.from('kitchen_tickets').select('*').eq('business_id', businessId);
    if (statusFilter && statusFilter !== 'ALL') {
      query = query.eq('status', statusFilter);
    } else {
      query = query.neq('status', 'CANCELLED');
    }
    query = query.order('created_at', { ascending: false }).limit(60);

    const { data, error } = await query;
    if (error) console.warn('[KOT fetch warning]:', error.message);
    dbTickets = data || [];
    serverTicketCache = { businessId, tickets: dbTickets, expiry: now + 3500 };
  }

  const inMemTickets = getKitchenTickets(businessId);
  const seen = new Set<string>();
  const merged: KitchenTicket[] = [];

  for (const t of inMemTickets) {
    if (statusFilter && statusFilter !== 'ALL' && t.status !== statusFilter) continue;
    const key = t.ticket_number || t.id;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(t as KitchenTicket);
    }
  }

  for (const t of dbTickets) {
    const key = t.ticket_number || t.id;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(t as KitchenTicket);
    }
  }

  return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

```

### lib/services/kitchen/order-sync.util.ts (39 lines)
```typescript
const ORDER_STATUS_MAP: Record<string, string> = {
  PREPARING: 'preparing',
  READY: 'ready',
  SERVED: 'served',
  PENDING: 'open',
};

const IS_UUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export async function syncOrderOnKotChange(
  supabase: any,
  businessId: string,
  status: string,
  targetOrderId?: string | null,
  targetTable?: string | null
) {
  const mapped = ORDER_STATUS_MAP[status];
  if (!mapped || !businessId) return;

  const nowIso = new Date().toISOString();
  try {
    if (targetOrderId && IS_UUID(targetOrderId)) {
      await supabase.from('orders').update({ status: mapped }).eq('id', targetOrderId);
      await supabase.from('order_items').update({ kot_status: status.toLowerCase() }).eq('order_id', targetOrderId);
    } else if (targetTable) {
      const clean = targetTable.replace(/\s*\([^)]*\)/g, '').trim();
      const norm = clean.replace(/^(table|t-)\s*/i, '').trim().toUpperCase();
      await supabase
        .from('orders')
        .update({ status: mapped })
        .eq('business_id', businessId)
        .or(`table_number.eq.${clean},table_number.eq.Table ${clean},table_number.eq.T-${norm}`)
        .not('status', 'in', '("settled","SETTLED","closed","CLOSED","cancelled","CANCELLED")');
    }
  } catch (err) {
    console.warn('[Orders DB sync warning]:', err);
  }
}

```

### lib/services/kitchen/update-ticket.service.ts (41 lines)
```typescript
import { updateKitchenTicketStatus, getKitchenTickets } from '@/lib/store/active-order-store';
import { syncOrderOnKotChange } from './order-sync.util';
import { invalidateKitchenTicketsCache } from './get-tickets.service';

const IS_UUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export async function updateKitchenTicket(
  supabase: any,
  businessId: string,
  id: string,
  status: string,
  items?: any[]
) {
  const updatePayload: any = { status, updated_at: new Date().toISOString() };
  if (items && Array.isArray(items)) updatePayload.items = items;

  let matchedTicketNumber: string | null = null;
  try {
    invalidateKitchenTicketsCache();
    updateKitchenTicketStatus(id, status as any);
    const inMem = getKitchenTickets().find((x) => x.id === id || x.ticket_number === id);
    if (inMem?.ticket_number) matchedTicketNumber = inMem.ticket_number;
  } catch {}

  let query = supabase.from('kitchen_tickets').update(updatePayload).eq('business_id', businessId);
  if (IS_UUID(id)) {
    query = query.eq('id', id);
  } else if (matchedTicketNumber) {
    query = query.eq('ticket_number', matchedTicketNumber);
  } else {
    query = query.eq('ticket_number', id);
  }

  const { data: ticket } = await query.select().maybeSingle();
  const targetOrderId = ticket?.order_id;
  const targetTable = ticket?.table_or_room;

  await syncOrderOnKotChange(supabase, businessId, status, targetOrderId, targetTable);
  return ticket || { id, status, ...updatePayload };
}

```

### lib/services/orders.service.ts (8 lines)
```typescript
export { isUuid, sanitizeUuid, normalizePaymentMethod } from './orders/order-uuid.util';
export { resolveTableTarget } from './orders/resolve-table-id.util';
export { resolveOrderBusinessId } from './orders/resolve-business.util';
export { deductRecipeInventoryForOrder } from './orders/recipe-deduction.service';
export { findActiveRoomStayOrder } from './orders/room-stay-order.util';
export { executeOrderMutation } from './orders/order-mutation.service';
export { createHostOrder } from './orders/create-order.service';

```

### lib/services/orders/create-order.service.ts (50 lines)
```typescript
import { sanitizeUuid, normalizePaymentMethod } from './order-uuid.util';
import { resolveTableTarget } from './resolve-table-id.util';
import { findActiveRoomStayOrder } from './room-stay-order.util';
import { executeOrderMutation } from './order-mutation.service';
import { deductRecipeInventoryForOrder } from './recipe-deduction.service';

export async function createHostOrder(supabase: any, businessId: string, body: any): Promise<any> {
  const { tableId, tableNumber } = await resolveTableTarget(supabase, businessId, body.tableId, body.tableNumber);
  const roomId = sanitizeUuid(body.roomId), guestId = sanitizeUuid(body.guestId);
  const locationId = sanitizeUuid(body.locationId), servedByStaffId = sanitizeUuid(body.servedByStaffId);
  const existingOrderId = sanitizeUuid(body.id || body.order_id);
  const paymentMethod = normalizePaymentMethod(body.paymentMethod);
  const { masterOrderId, customerName, customerPhone } = await findActiveRoomStayOrder(supabase, roomId);

  const grandTotal = Number(body.grandTotal ?? body.subtotal ?? 0);
  const subtotal = Number(body.subtotal ?? grandTotal);

  const orderPayload = {
    business_id: businessId,
    items: body.items || [],
    subtotal,
    discount_type: body.discountType || null,
    discount_value: Number(body.discountValue) || 0,
    discount_amount: Number(body.discountAmount) || 0,
    tax_amount: Number(body.taxAmount) || 0,
    grand_total: grandTotal,
    total_amount: grandTotal,
    payment_method: paymentMethod,
    table_id: tableId,
    table_number: tableNumber,
    order_source: body.orderSource || 'POS',
    order_type: body.orderType || (roomId ? 'room_service' : 'pos'),
    master_order_id: masterOrderId,
    customer_name: customerName || body.customer_name || body.guest_name || null,
    customer_phone: customerPhone || body.customer_phone || body.guest_phone || null,
    location_id: locationId,
    served_by_staff_id: servedByStaffId,
    staff_name: body.staffName || null,
    room_id: roomId,
    guest_id: guestId,
    status: body.status || 'SETTLED',
  };

  const order = await executeOrderMutation(supabase, orderPayload, existingOrderId);
  if (order?.id) {
    void deductRecipeInventoryForOrder(supabase, businessId, order.id, body.items || []);
  }
  return order;
}

```

### lib/services/orders/order-mutation.service.ts (43 lines)
```typescript
import { saveActiveOrder } from '@/lib/store/active-order-store';

export async function executeOrderMutation(
  supabase: any,
  orderData: Record<string, any>,
  existingOrderId: string | null
): Promise<any> {
  if (existingOrderId) {
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update(orderData)
      .eq('id', existingOrderId)
      .select()
      .maybeSingle();

    if (!updateError && updated) return updated;
  }

  const generatedId = crypto.randomUUID();
  const insertPayload = {
    id: existingOrderId || generatedId,
    ...orderData,
    created_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertError } = await supabase
    .from('orders')
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '42501' || insertError.message?.includes('row-level security')) {
      console.warn('[OrdersMutation] RLS fallback to in-memory store:', insertError.message);
      saveActiveOrder(insertPayload as any);
      return insertPayload;
    }
    throw insertError;
  }

  return inserted;
}

```

### lib/services/orders/order-uuid.util.ts (17 lines)
```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(val: unknown): val is string {
  return typeof val === 'string' && UUID_REGEX.test(val);
}

export function sanitizeUuid(val: unknown): string | null {
  return isUuid(val) ? val : null;
}

export function normalizePaymentMethod(method: unknown): 'UPI' | 'CASH' | 'CARD' {
  const upper = String(method || '').toUpperCase();
  if (upper === 'CASH') return 'CASH';
  if (upper === 'CARD') return 'CARD';
  return 'UPI';
}

```

### lib/services/orders/recipe-deduction.service.ts (40 lines)
```typescript
import { isUuid } from './order-uuid.util';

export async function deductRecipeInventoryForOrder(
  supabase: any,
  businessId: string,
  orderId: string,
  items: any[]
): Promise<void> {
  try {
    const validItems = (items || []).filter(
      (it: any) => it?.id && isUuid(it.id) && !it.isAdHoc && !String(it.id).startsWith('custom')
    );
    if (validItems.length === 0) return;

    const catalogIds = Array.from(new Set(validItems.map((i) => i.id)));
    const { data: recipes } = await supabase
      .from('recipe_ingredients')
      .select('catalog_item_id, raw_item_id, quantity_required')
      .in('catalog_item_id', catalogIds);

    if (!recipes || recipes.length === 0) return;

    for (const it of validItems) {
      const itemRecipes = recipes.filter((r: any) => r.catalog_item_id === it.id);
      const qty = Math.max(1, Number(it.qty) || 1);
      for (const rec of itemRecipes) {
        const deductQty = (Number(rec.quantity_required) || 0) * qty;
        await supabase.rpc('deduct_inventory_stock', {
          p_raw_item_id: rec.raw_item_id,
          p_qty_to_deduct: deductQty,
          p_business_id: businessId,
          p_notes: `POS Auto-Deduction for Order ${orderId}`,
        });
      }
    }
  } catch (e) {
    console.error('[RecipeDeduction] Inventory deduction failed:', e);
  }
}

```

### lib/services/orders/resolve-business.util.ts (38 lines)
```typescript
import { isUuid } from './order-uuid.util';

const DEFAULT_FALLBACK_BIZ = 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';

export async function resolveOrderBusinessId(
  supabase: any,
  request: Request,
  body?: any
): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const { data: biz } = await supabase
        .from('businesses')
        .select('id')
        .eq('host_id', user.id)
        .maybeSingle();
      if (biz?.id && isUuid(biz.id)) return biz.id;
    }
  } catch {}

  const candidate = body?.business_id || body?.cafe_id || request.headers.get('x-business-id');
  if (isUuid(candidate)) return candidate;

  try {
    const url = new URL(request.url);
    const param = url.searchParams.get('business_id') || url.searchParams.get('cafe_id');
    if (isUuid(param)) return param;
  } catch {}

  try {
    const { data: fallbackBiz } = await supabase.from('businesses').select('id').limit(1).maybeSingle();
    if (fallbackBiz?.id && isUuid(fallbackBiz.id)) return fallbackBiz.id;
  } catch {}

  return DEFAULT_FALLBACK_BIZ;
}

```

### lib/services/orders/resolve-table-id.util.ts (45 lines)
```typescript
import { isUuid } from './order-uuid.util';

export async function resolveTableTarget(
  supabase: any,
  businessId: string,
  rawTableId?: unknown,
  rawTableNumber?: unknown
): Promise<{ tableId: string | null; tableNumber: string }> {
  if (isUuid(rawTableId)) {
    return {
      tableId: rawTableId,
      tableNumber: String(rawTableNumber || 'Takeaway / Counter'),
    };
  }

  const search = String(rawTableId || rawTableNumber || '').trim();
  if (!search || search.toLowerCase().includes('takeaway') || search.toLowerCase().includes('counter')) {
    return { tableId: null, tableNumber: 'Takeaway / Counter' };
  }

  const norm = search.replace(/\s*\([^)]*\)/g, '').replace(/^(table|t-)\s*/i, '').trim().toUpperCase();

  try {
    const { data: tableRow } = await supabase
      .from('restaurant_tables')
      .select('id, table_number')
      .eq('business_id', businessId)
      .or(`table_number.eq.${norm},table_number.eq.T-${norm},table_number.eq.Table ${norm}`)
      .limit(1)
      .maybeSingle();

    if (tableRow?.id && isUuid(tableRow.id)) {
      return {
        tableId: tableRow.id,
        tableNumber: tableRow.table_number || String(rawTableNumber || `T-${norm}`),
      };
    }
  } catch {}

  return {
    tableId: null,
    tableNumber: String(rawTableNumber || rawTableId || norm || 'Takeaway / Counter'),
  };
}

```

### lib/services/orders/room-stay-order.util.ts (31 lines)
```typescript
import { sanitizeUuid } from './order-uuid.util';

export async function findActiveRoomStayOrder(
  supabase: any,
  roomId: string | null
): Promise<{ masterOrderId: string | null; customerName: string | null; customerPhone: string | null }> {
  if (!roomId) return { masterOrderId: null, customerName: null, customerPhone: null };

  try {
    const { data: activeMaster } = await supabase
      .from('orders')
      .select('id, customer_name, customer_phone')
      .eq('room_id', roomId)
      .eq('order_type', 'room_stay')
      .not('status', 'in', '("SETTLED","CANCELLED","COMPLETED")')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeMaster?.id) {
      return {
        masterOrderId: sanitizeUuid(activeMaster.id),
        customerName: activeMaster.customer_name || null,
        customerPhone: activeMaster.customer_phone || null,
      };
    }
  } catch {}

  return { masterOrderId: null, customerName: null, customerPhone: null };
}

```

### lib/services/session.service.ts (9 lines)
```typescript
export * from './session/session-entry.util';
export * from './session/active-sessions.service';
export * from './session/bill-history.service';
export * from './session/detailed-session.service';
export * from './session/settle-orders.util';
export * from './session/close-session-tables.util';
export * from './session/settle-session-complete.util';
export * from './session/settle-session.service';

```

### lib/services/session/active-sessions.service.ts (51 lines)
```typescript
import { getAllActiveOrders } from '@/lib/store/active-order-store';
import { CLOSED_STATUSES, normalizeTable, createSessionEntry } from './session-entry.util';

export async function getActiveHostSessions(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  let businessId: string | null = null;
  if (user) {
    const { data: biz } = await supabase.from('businesses').select('id').eq('host_id', user.id).maybeSingle();
    businessId = biz?.id || null;
  }
  if (!businessId) {
    const { data: fallbackBiz } = await supabase.from('businesses').select('id').limit(1).maybeSingle();
    businessId = fallbackBiz?.id || 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
  }

  const [ordsRes, sListRes] = await Promise.all([
    supabase.from('orders').select('*').eq('business_id', businessId)
      .not('status', 'in', `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`).order('created_at', { ascending: false }),
    supabase.from('dine_in_sessions').select('*').eq('business_id', businessId).in('status', ['open', 'bill_requested']),
  ]);

  const dbOrders = ordsRes?.data || [];
  const dbSessions = sListRes?.data || [];
  const inMemOrders = getAllActiveOrders(businessId);

  const sessionByTable = new Map<string, any>(), sessionById = new Map<string, any>();
  for (const s of dbSessions) {
    if (s.id) sessionById.set(s.id, s);
    if (s.table_id) sessionByTable.set(s.table_id, s);
    if (s.table_number) { sessionByTable.set(s.table_number, s); sessionByTable.set(normalizeTable(s.table_number), s); }
  }

  const sessionMap: Record<string, any> = {}, processedTables = new Set<string>();
  const addEntry = (o: any, tNum: string) => {
    const norm = normalizeTable(tNum);
    if (!norm || processedTables.has(norm)) return;
    const linked = sessionByTable.get(norm) || (o.session_id ? sessionById.get(o.session_id) : null) || (o.table_id ? sessionByTable.get(o.table_id) : null);
    const entry = createSessionEntry(o, linked, tNum);
    if (entry.subtotal > 0 || entry.grandTotal > 0 || entry.itemsCount > 0) {
      processedTables.add(norm); sessionMap[tNum] = entry; sessionMap[norm] = entry;
      sessionMap[`T-${norm}`] = entry; if (linked?.table_id) sessionMap[linked.table_id] = entry;
      if (o.table_id) sessionMap[o.table_id] = entry;
    }
  };

  for (const o of inMemOrders) addEntry(o, o.table_number);
  for (const o of dbOrders) addEntry(o, o.table_number || (o.table_id ? sessionByTable.get(o.table_id)?.table_number : '') || '');

  return { success: true, sessions: sessionMap };
}

```

### lib/services/session/bill-history.service.ts (43 lines)
```typescript
export async function getBillRequestHistory(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  let businessId: string | null = null;
  if (user) {
    const { data: business } = await supabase.from('businesses').select('id').eq('host_id', user.id).maybeSingle();
    businessId = business?.id || null;
  }
  if (!businessId) {
    const { data: business } = await supabase.from('businesses').select('id').limit(1).maybeSingle();
    businessId = business?.id || 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
  }

  const { data: events } = await supabase.from('bill_request_events').select('*')
    .eq('business_id', businessId).order('requested_at', { ascending: false }).limit(100);

  const sessionIds = Array.from(new Set((events || []).map((e: any) => e.session_id).filter(Boolean)));
  const { data: sessions } = sessionIds.length
    ? await supabase.from('dine_in_sessions').select('id, status').in('id', sessionIds)
    : { data: [] };
  const statusById = new Map((sessions || []).map((s: any) => [s.id, s.status]));

  let inMemRequests: any[] = [];
  try {
    const { getInMemBillRequests } = await import('@/lib/store/active-order-store');
    inMemRequests = getInMemBillRequests(businessId) || [];
  } catch {}

  const dbMapped = (events || []).map((e: any) => {
    const stat = statusById.get(e.session_id);
    return { ...e, session_status: Boolean(e.settled_at || stat === 'closed') ? 'closed' : (stat || 'bill_requested') };
  });

  const seenKeys = new Set(dbMapped.map((r: any) => `${r.table_number}_${r.session_id || ''}`));
  const combined = [...dbMapped];
  for (const imr of inMemRequests) {
    const key = `${imr.table_number}_${imr.session_id || ''}`;
    if (!seenKeys.has(key)) { seenKeys.add(key); combined.push(imr); }
  }

  combined.sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
  return { success: true, requests: combined };
}

```

### lib/services/session/close-session-tables.util.ts (52 lines)
```typescript
import { closeActiveOrder, settleInMemBillRequests } from '@/lib/store/active-order-store';
import { buildTableOrFilter } from './session-entry.util';

export async function closeSessionAndTableCompletely(sessionId: string, tableId: string, client?: any) {
  const supabase = client || (await import('@/lib/supabase/client')).createClient();
  const nowIso = new Date().toISOString();
  if (sessionId) {
    const { error: sErr } = await supabase.from('dine_in_sessions').update({ status: 'closed', updated_at: nowIso }).eq('id', sessionId);
    if (sErr) throw sErr;
  }
  if (tableId) {
    const { error: tErr } = await supabase.from('restaurant_tables').update({ status: 'VACANT' }).eq('id', tableId);
    if (tErr) throw tErr;
  }
  return { success: true };
}

export async function closeSessionAndVacateTables(
  supabase: any, businessId: string, targetSessionId: string | null,
  resolvedTableId: string | null, rawTable: string, normTable: string, nowIso: string
): Promise<any> {
  let closedSession: any = null;
  const tableOr = rawTable ? buildTableOrFilter(rawTable) : '';

  if (targetSessionId) {
    const { data: u } = await supabase.from('dine_in_sessions').update({ status: 'closed', updated_at: nowIso })
      .eq('id', targetSessionId).select().maybeSingle();
    if (u) closedSession = u;
  }
  if (resolvedTableId) {
    const { data: u } = await supabase.from('dine_in_sessions').update({ status: 'closed', updated_at: nowIso })
      .eq('table_id', resolvedTableId).select().maybeSingle();
    if (u && !closedSession) closedSession = u;
    try { await supabase.from('restaurant_tables').update({ status: 'VACANT' }).eq('id', resolvedTableId); } catch {}
  }
  if (rawTable && tableOr) {
    const { data: u } = await supabase.from('dine_in_sessions').update({ status: 'closed', updated_at: nowIso })
      .eq('business_id', businessId).or(tableOr).select().maybeSingle();
    if (u && !closedSession) closedSession = u;
    try { await supabase.from('restaurant_tables').update({ status: 'VACANT' }).eq('business_id', businessId).or(tableOr); } catch {}
    closeActiveOrder(businessId, rawTable);
  }

  try {
    if (targetSessionId) await supabase.from('bill_request_events').update({ settled_at: nowIso }).eq('session_id', targetSessionId).is('settled_at', null);
    if (rawTable && tableOr) await supabase.from('bill_request_events').update({ settled_at: nowIso }).eq('business_id', businessId).or(tableOr).is('settled_at', null);
    settleInMemBillRequests(businessId, rawTable, targetSessionId);
  } catch {}

  return closedSession;
}

```

### lib/services/session/detailed-session.service.ts (60 lines)
```typescript
import { aggregateOrderItems } from '@/lib/utils/qr-session';
import { findActiveOrder } from '@/lib/store/active-order-store';
import { CLOSED_STATUSES, normalizeTable, buildTableOrFilter } from './session-entry.util';

export async function getDetailedHostSession(requestUrl: string, supabase: any) {
  const { searchParams } = new URL(requestUrl);
  const sessionId = searchParams.get('session_id'), tableNumber = searchParams.get('table_number');
  const tableId = searchParams.get('table_id'), orderId = searchParams.get('order_id');
  const rawTable = (tableNumber || '').trim(), normTable = normalizeTable(rawTable);
  const resolvedBizId = 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269', tableOr = rawTable ? buildTableOrFilter(rawTable) : '';

  const inMemOrder = findActiveOrder(resolvedBizId, rawTable) || findActiveOrder(resolvedBizId, normTable);
  let targetOrderId: string | null = orderId || inMemOrder?.id || null;
  let targetSessionId: string | null = sessionId || (inMemOrder as any)?.session_id || null;

  if (!targetSessionId && (tableId || rawTable)) {
    let q = supabase.from('dine_in_sessions').select('*').in('status', ['open', 'bill_requested']).order('created_at', { ascending: false }).limit(1);
    if (tableId && tableOr) q = q.or(`table_id.eq.${tableId},${tableOr}`);
    else if (tableId) q = q.eq('table_id', tableId);
    else if (tableOr) q = q.or(tableOr);
    const { data: s } = await q.maybeSingle();
    if (s) { targetSessionId = s.id; if (!targetOrderId && s.order_id) targetOrderId = s.order_id; }
  }

  if (!targetOrderId && (targetSessionId || rawTable || tableId)) {
    let q = supabase.from('orders').select('*').not('status', 'in', `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`).order('created_at', { ascending: false }).limit(1);
    if (targetSessionId && (tableId || tableOr)) q = q.or(`session_id.eq.${targetSessionId},${tableId ? `table_id.eq.${tableId},` : ''}${tableOr}`);
    else if (targetSessionId) q = q.eq('session_id', targetSessionId);
    else if (tableId && tableOr) q = q.or(`table_id.eq.${tableId},${tableOr}`);
    else if (tableId) q = q.eq('table_id', tableId);
    else if (rawTable && tableOr) q = q.or(tableOr);
    const { data: ord } = await q.maybeSingle();
    if (ord) targetOrderId = ord.id;
  }

  if (!targetSessionId && !targetOrderId && !inMemOrder) {
    return { success: true, session: null, order: null, items: [], aggregated: [] };
  }
  let session: any = null, order: any = null, items: any[] = [];
  if (targetSessionId) { const { data: s } = await supabase.from('dine_in_sessions').select('*').eq('id', targetSessionId).maybeSingle(); session = s; }
  if (targetOrderId) { const { data: o } = await supabase.from('orders').select('*').eq('id', targetOrderId).maybeSingle(); order = o || inMemOrder; }
  else if (targetSessionId) { const { data: o } = await supabase.from('orders').select('*').eq('session_id', targetSessionId).maybeSingle(); order = o || inMemOrder; }
  if (!order && inMemOrder) order = inMemOrder;
  if (session && !['open', 'bill_requested'].includes(session.status?.toLowerCase())) session = null;
  if (order && CLOSED_STATUSES.includes(order.status?.toLowerCase())) order = null;
  if (!session && !order) return { success: true, session: null, order: null, items: [], aggregated: [] };

  if (order) {
    const { data: rawItems } = order.id ? await supabase.from('order_items').select('*').eq('order_id', order.id).order('created_at', { ascending: true }) : { data: null };
    items = rawItems && rawItems.length > 0 ? rawItems : Array.isArray(order.items) ? order.items : Array.isArray(order.raw_items) ? order.raw_items : [];
  }
  return { success: true, session, order, items, aggregated: aggregateOrderItems(items) };
}
export async function fetchActiveSessionLines(bodyOrUrl: any, supabase: any) {
  if (typeof bodyOrUrl === 'string') return getDetailedHostSession(bodyOrUrl, supabase);
  const p = new URLSearchParams();
  ['session_id', 'table_number', 'table_id', 'order_id'].forEach((k) => { if (bodyOrUrl?.[k]) p.set(k, bodyOrUrl[k]); });
  return getDetailedHostSession(`http://localhost?${p.toString()}`, supabase);
}

```

### lib/services/session/session-entry.util.ts (50 lines)
```typescript
export const CLOSED_STATUSES = [
  'settled', 'SETTLED', 'completed', 'COMPLETED',
  'cancelled', 'CANCELLED', 'billed', 'BILLED',
  'closed', 'CLOSED', 'paid', 'PAID',
];


export const normalizeTable = (t: string) => {
  return (t || '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^table\s*/i, '')
    .replace(/^t-/i, '')
    .trim()
    .toUpperCase();
};

export function getTableVariants(rawTable: string): string[] {
  if (!rawTable) return [];
  const raw = rawTable.trim(), norm = normalizeTable(raw);
  const unpad = norm.replace(/^0+/, '') || norm;
  const pad = norm.length === 1 ? `0${norm}` : norm;
  const set = new Set<string>([raw, norm, unpad, pad, `T-${norm}`, `T-${unpad}`, `T-${pad}`, `Table ${norm}`, `Table ${unpad}`, `Table ${pad}`, `Table ${raw}`]);
  return Array.from(set).filter(Boolean);
}

export function buildTableOrFilter(rawTable: string, col = 'table_number'): string {
  return getTableVariants(rawTable).map((v) => `${col}.eq.${v}`).join(',');
}

export function createSessionEntry(o: any, linkedSession: any, tNum: string) {
  const subtotal = Number(o.subtotal) || Number(o.grand_total) || 0;
  const grandTotal = Number(o.grand_total) || subtotal;
  const itemsCount = Array.isArray(o.items) ? o.items.length : Array.isArray(o.raw_items) ? o.raw_items.length : 0;
  const isBillReq = linkedSession?.status === 'bill_requested';

  return {
    sessionId: linkedSession?.id || o.session_id || `sess_${o.id}`,
    orderId: o.id,
    status: isBillReq ? 'bill_requested' : 'open',
    subtotal,
    grandTotal,
    itemsCount,
    updatedAt: o.updated_at || o.created_at || new Date().toISOString(),
    guestSessionId: linkedSession?.guest_session_id || o.session_id || null,
    tableNumber: tNum,
    customerName: o.customer_name || 'Guest',
  };
}


```

### lib/services/session/settle-orders.util.ts (54 lines)
```typescript
import { CLOSED_STATUSES, buildTableOrFilter } from './session-entry.util';

const IS_UUID = (v: any) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export async function updateSettledOrdersInDb(
  supabase: any,
  businessId: string,
  targetSessionId: string | null,
  rawTable: string,
  normTable: string,
  orderId?: string | null,
  body?: any,
  resolvedTableId?: string | null
) {
  const nowIso = new Date().toISOString();
  const orderUpdate = {
    status: 'settled',
    payment_method: body?.payment_method || 'UPI',
    items: body?.final_items,
    subtotal: Number(body?.subtotal) || 0,
    tax_amount: Number(body?.tax_amount) || 0,
    grand_total: Number(body?.grand_total || body?.subtotal || 0),
    total_amount: Number(body?.grand_total || body?.subtotal || 0),
    discount_amount: Number(body?.discount_amount) || 0,
    discount_type: body?.discount_type || 'flat',
    discount_value: Number(body?.discount_value) || 0,
    // NOTE: orders.updated_at does NOT exist in SSOT schema. Omitted.
  };

  if (orderId && IS_UUID(orderId)) {
    try { await supabase.from('orders').update(orderUpdate).eq('id', orderId); } catch {}
  }
  if (targetSessionId && IS_UUID(targetSessionId)) {
    try {
      await supabase.from('orders').update({ status: 'settled' })
        .eq('session_id', targetSessionId).not('status', 'in', `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`);
    } catch {}
  }
  if (resolvedTableId && IS_UUID(resolvedTableId)) {
    try {
      await supabase.from('orders').update({ status: 'settled' })
        .eq('table_id', resolvedTableId).not('status', 'in', `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`);
    } catch {}
  }
  if (rawTable) {
    const tableOr = buildTableOrFilter(rawTable);
    try {
      await supabase.from('orders').update({ status: 'settled' })
        .eq('business_id', businessId).or(tableOr).not('status', 'in', `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`);
    } catch {}
  }
}


```

### lib/services/session/settle-session-complete.util.ts (44 lines)
```typescript
import { createClient } from '@/lib/supabase/client';

const IS_UUID = (v: any) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export async function executeAtomicTableSettlement(
  sessionId?: string | null,
  tableId?: string | null,
  orderId?: string | null,
  client?: any
) {
  const supabase = client || createClient();
  const nowIso = new Date().toISOString();

  // 1. Mark order as COMPLETED if provided
  if (orderId && IS_UUID(orderId)) {
    try { await supabase.from('orders').update({ status: 'COMPLETED' }).eq('id', orderId); } catch {}
  }

  // 2. Force close dine-in session
  if (sessionId) {
    try {
      const q = IS_UUID(sessionId)
        ? supabase.from('dine_in_sessions').update({ status: 'closed', updated_at: nowIso }).eq('id', sessionId)
        : supabase.from('dine_in_sessions').update({ status: 'closed', updated_at: nowIso }).eq('guest_session_id', sessionId);
      await q;
    } catch {}
  }

  // 3. Force table to VACANT so POS UI instantly shows it as vacant
  if (tableId) {
    try {
      const tQ = IS_UUID(tableId)
        ? supabase.from('restaurant_tables').update({ status: 'VACANT' }).eq('id', tableId)
        : supabase.from('restaurant_tables').update({ status: 'VACANT' }).eq('table_number', tableId);
      await tQ;
    } catch {}
    if (IS_UUID(tableId)) {
      try { await supabase.from('dine_in_sessions').update({ status: 'closed', updated_at: nowIso }).eq('table_id', tableId); } catch {}
    }
  }

  return { success: true };
}

```

### lib/services/session/settle-session.service.ts (191 lines)
```typescript
import { normalizeTable, buildTableOrFilter } from './session-entry.util';
import { updateSettledOrdersInDb } from './settle-orders.util';
import { closeSessionAndVacateTables } from './close-session-tables.util';
import { executeAtomicTableSettlement } from './settle-session-complete.util';
const IS_UUID = (v: any) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export async function settleAndVacateSession(body: any, supabase: any) {
  const { session_id, order_id, table_id, table_number, business_id } = body;
  const nowIso = new Date().toISOString();
  let rawTable = (table_number || '').trim(), normTable = normalizeTable(rawTable);
  let businessId = IS_UUID(business_id) ? business_id : 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
  let resolvedTableId = IS_UUID(table_id) ? table_id : null, targetSessionId = IS_UUID(session_id) ? session_id : null;
  if (table_id && !rawTable && !resolvedTableId) { rawTable = String(table_id).trim(); normTable = normalizeTable(rawTable); }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: b } = await supabase.from('businesses').select('id').eq('host_id', user.id).maybeSingle();
      if (b?.id) businessId = b.id;
    }
  } catch {}

  let resolvedOrder: any = null;
  if (order_id && IS_UUID(order_id)) {
    try {
      const { data: ord } = await supabase.from('orders').select('id, business_id, session_id, table_id, table_number, customer_name, customer_phone, grand_total, subtotal').eq('id', order_id).maybeSingle();
      if (ord) {
        resolvedOrder = ord;
        businessId = ord.business_id || businessId;
        if (!targetSessionId && ord.session_id) targetSessionId = ord.session_id;
        if (!resolvedTableId && ord.table_id) resolvedTableId = ord.table_id;
        if (!rawTable && ord.table_number) { rawTable = ord.table_number; normTable = normalizeTable(rawTable); }
      }
    } catch {}
  }

  const tableOr = rawTable ? buildTableOrFilter(rawTable) : '';
  if (resolvedTableId) {
    const { data: t } = await supabase.from('restaurant_tables').select('id, business_id, table_number').eq('id', resolvedTableId).maybeSingle();
    if (t) { businessId = t.business_id || businessId; if (!rawTable) { rawTable = t.table_number || rawTable; normTable = normalizeTable(rawTable); } }
  } else if (rawTable && tableOr) {
    const { data: t } = await supabase.from('restaurant_tables').select('id, business_id').eq('business_id', businessId).or(tableOr).limit(1).maybeSingle();
    if (t?.id && IS_UUID(t.id)) resolvedTableId = t.id;
  }

  if (targetSessionId) {
    const { data: s } = await supabase.from('dine_in_sessions').select('id, business_id, table_id, table_number, guest_handle, guest_name, guest_session_id').eq('id', targetSessionId).maybeSingle();
    if (s) { businessId = s.business_id || businessId; resolvedTableId = resolvedTableId || (IS_UUID(s.table_id) ? s.table_id : null); if (!rawTable) { rawTable = s.table_number || ''; normTable = normalizeTable(rawTable); } }
  } else if (resolvedTableId || rawTable) {
    let q = supabase.from('dine_in_sessions').select('id, business_id, table_id, table_number, guest_handle, guest_name, guest_session_id').in('status', ['open', 'bill_requested']).order('created_at', { ascending: false }).limit(1);
    q = resolvedTableId ? q.eq('table_id', resolvedTableId) : q.eq('business_id', businessId).or(tableOr);
    const { data: s } = await q.maybeSingle();
    if (s) { targetSessionId = s.id; businessId = s.business_id || businessId; resolvedTableId = resolvedTableId || (IS_UUID(s.table_id) ? s.table_id : null); if (!rawTable) { rawTable = s.table_number || ''; normTable = normalizeTable(rawTable); } }
  }

  if (!resolvedOrder && (targetSessionId || rawTable)) {
    try {
      const q = targetSessionId
        ? supabase.from('orders').select('id, business_id, session_id, table_id, table_number, customer_name, customer_phone, grand_total, subtotal').eq('session_id', targetSessionId).order('created_at', { ascending: false }).limit(1)
        : supabase.from('orders').select('id, business_id, session_id, table_id, table_number, customer_name, customer_phone, grand_total, subtotal').eq('business_id', businessId).or(tableOr).order('created_at', { ascending: false }).limit(1);
      const { data: ord } = await q.maybeSingle();
      if (ord) resolvedOrder = ord;
    } catch {}
  }

  await updateSettledOrdersInDb(supabase, businessId, targetSessionId, rawTable, normTable, order_id, body, resolvedTableId);
  const closedSession = await closeSessionAndVacateTables(supabase, businessId, targetSessionId, resolvedTableId, rawTable, normTable, nowIso);
  await executeAtomicTableSettlement(targetSessionId, resolvedTableId || rawTable, order_id, supabase);

  // ── Automated Guest Wallet Cashback Credit Engine ────────────────────────
  let cashbackResult: any = null;
  const settledTotal = Number(
    body?.grand_total || body?.subtotal || resolvedOrder?.grand_total || resolvedOrder?.total_amount || resolvedOrder?.subtotal || 0
  );
  const guestHandle = closedSession?.guest_handle || body?.guest_handle || null;
  const guestName = resolvedOrder?.customer_name || body?.customer_name || body?.guest_name || closedSession?.guest_name || null;
  const guestPhone = resolvedOrder?.customer_phone || body?.customer_phone || null;
  const guestSessionId = closedSession?.guest_session_id || targetSessionId || null;
  const primaryGuestId = guestHandle || guestPhone || guestSessionId || guestName || `table_${normTable}`;

  // Store in recentSettledOrders so subsequent guest menu fetches & polls know this table is settled
  try {
    const { recentSettledOrders, getTableKey } = await import('@/lib/store/active-order-store');
    const key = getTableKey(businessId, rawTable);
    recentSettledOrders.set(key, {
      id: resolvedOrder?.id || order_id || `settled-${Date.now()}`,
      business_id: businessId,
      table_number: rawTable,
      session_id: targetSessionId,
      status: 'settled',
      subtotal: Number(body?.subtotal || resolvedOrder?.subtotal || settledTotal),
      tax_amount: Number(body?.tax_amount || resolvedOrder?.tax_amount || 0),
      grand_total: settledTotal,
      total_amount: settledTotal,
      customer_name: guestName,
      customer_phone: guestPhone,
      items: body?.final_items || resolvedOrder?.items || [],
      raw_items: [],
      created_at: resolvedOrder?.created_at || nowIso,
      updated_at: nowIso,
    });
  } catch {}

  try {
    if (settledTotal > 0) {
      const { creditOrderCashback } = await import('@/lib/services/wallet/cashback.service');
      let resolvedCafeName: string | null = body?.cafe_name || null;
      if (!resolvedCafeName && supabase && IS_UUID(businessId)) {
        try {
          const { data: b } = await supabase.from('businesses').select('name').eq('id', businessId).maybeSingle();
          if (b?.name) resolvedCafeName = b.name;
        } catch {}
      }

      cashbackResult = await creditOrderCashback(supabase, {
        business_id: businessId,
        cafe_id: businessId,
        cafe_name: resolvedCafeName,
        guest_id: primaryGuestId,
        guest_handle: guestHandle,
        guest_name: guestName,
        customer_phone: guestPhone,
        guest_session_id: guestSessionId,
        order_id: resolvedOrder?.id || order_id || null,
        order_total: settledTotal,
        table_number: rawTable,
      });
    }
  } catch (err) {
    console.warn('[Wallet Settlement Credit Warning]:', err);
  }

  // ── Automated Guest Wallet Redemption Finalizer ──────────────────────────
  let redemptionResult: any = null;
  const redemptionCode = body?.redemption_code || body?.redemptionCode;
  try {
    if (redemptionCode) {
      const { finalizeRedemptionExecution } = await import('@/lib/services/wallet/redemption.service');
      redemptionResult = await finalizeRedemptionExecution(supabase, {
        code: redemptionCode,
        order_id: resolvedOrder?.id || order_id || null,
        table_number: rawTable,
        business_id: businessId,
        settled_total: settledTotal,
      });
    }
  } catch (rErr) {
    console.warn('[Wallet Settlement Redemption Finalize Note]:', rErr);
  }

  // ── Automated Recipe-Driven Inventory Deduction & Alerting ───────────────
  try {
    const finalOrderId = resolvedOrder?.id || order_id;
    if (finalOrderId) {
      const { deductInventoryForOrder } = await import('@/lib/services/inventory/recipe-deduction.service');
      void deductInventoryForOrder(supabase, finalOrderId, businessId);
    }
  } catch (invErr) {
    console.warn('[Settlement Inventory Deduction Note]:', invErr);
  }

  // Realtime notification broadcast to guest table channel
  try {
    if (rawTable && supabase?.channel) {
      const channel = supabase.channel(`guest-session-sync-${rawTable}`);
      await channel.send({
        type: 'broadcast',
        event: 'table_settled',
        payload: {
          table_number: rawTable,
          settled_total: settledTotal,
          cashback: cashbackResult?.cashback_amount,
          redeemed: redemptionResult?.redeemed_amount,
        },
      });
      if (typeof supabase.removeChannel === 'function') {
        setTimeout(() => { void supabase.removeChannel(channel); }, 500);
      }
    }
  } catch {}

  return {
    success: true,
    message: 'Table marked vacant, session closed, and order settled',
    session: closedSession,
    status: 'VACANT',
    cashback: cashbackResult,
    redemption: redemptionResult,
  };
}

```

### lib/services/table.service.ts (6 lines)
```typescript
export { CLOSED_STATUSES, normalizeTable } from './session/session-entry.util';
export { deriveTableOccupancy } from './table/table-occupancy.util';
export { getHostTables } from './table/get-tables.service';
export { createHostTable, deleteHostTable } from './table/table-crud.service';
export { updateHostTable } from './table/update-table.service';

```

### lib/services/table/get-tables.service.ts (69 lines)
```typescript
import { getAllActiveOrders } from '@/lib/store/active-order-store';
import { CLOSED_STATUSES } from '../session/session-entry.util';
import { deriveTableOccupancy } from './table-occupancy.util';

const tCache = new Map<string, { res: any; exp: number }>();

export function invalidateTablesCache(businessId?: string) {
  if (businessId) {
    tCache.forEach((_, k) => {
      if (k.startsWith(businessId)) tCache.delete(k);
    });
  } else {
    tCache.clear();
  }
}

export async function getHostTables(requestUrl: string, supabase: any) {
  const { searchParams } = new URL(requestUrl);
  const locationId = searchParams.get('location_id');
  const skipCache = searchParams.get('skip_cache') === 'true';
  let businessId = searchParams.get('business_id') || searchParams.get('cafe_id') || searchParams.get('venue_id');

  if (!businessId) {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      const { data: b } = await supabase.from('businesses').select('id').eq('host_id', authData.user.id).maybeSingle();
      if (b) businessId = b.id;
    }
  }
  if (!businessId) {
    const { data: fb } = await supabase.from('businesses').select('id').limit(1).maybeSingle();
    businessId = fb?.id || 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
  }

  const cacheKey = `${businessId}_${locationId || ''}`;
  if (!skipCache) {
    const hit = tCache.get(cacheKey);
    if (hit && Date.now() < hit.exp) return hit.res;
  }

  let q = supabase.from('restaurant_tables').select('*').eq('business_id', businessId).order('table_number', { ascending: true });
  if (locationId) q = q.eq('location_id', locationId);

  const inMemOrders = getAllActiveOrders(businessId);
  let [tablesRes, ordsRes] = await Promise.all([
    q,
    supabase.from('orders').select('id, table_number, table_id, grand_total, subtotal, status, items')
      .eq('business_id', businessId).not('status', 'in', `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`),
  ]);

  if (tablesRes.error) throw tablesRes.error;

  let tablesData = tablesRes.data || [];
  // Fallback to primary seed venue if this business has no tables provisioned yet
  if (tablesData.length === 0 && businessId !== 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269') {
    const fallbackQ = await supabase.from('restaurant_tables').select('*').eq('business_id', 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269').order('table_number', { ascending: true });
    if (!fallbackQ.error && fallbackQ.data && fallbackQ.data.length > 0) {
      tablesData = fallbackQ.data;
      businessId = 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
    }
  }

  const derivedTables = deriveTableOccupancy(tablesData, inMemOrders, ordsRes?.data || [], supabase);
  const res = { tables: derivedTables, businessId };
  tCache.set(cacheKey, { res, exp: Date.now() + 2500 });
  return res;
}


```

### lib/services/table/resolve-table.util.ts (47 lines)
```typescript
export async function resolveTargetTable(
  supabase: any,
  businessId?: string | null,
  id?: string,
  table_number?: string
) {
  let targetId = id;
  let targetNum = table_number;
  let resolvedBiz = businessId;

  // 1. If targetId provided, check if it actually exists in DB
  if (targetId) {
    const { data: t } = await supabase
      .from('restaurant_tables')
      .select('id, table_number, business_id')
      .eq('id', targetId)
      .maybeSingle();

    if (t) {
      targetNum = t.table_number;
      if (!resolvedBiz) resolvedBiz = t.business_id;
    } else {
      // ID was not found in DB (e.g., synthetic client ID). Clear it so we fallback to table_number
      targetId = undefined;
    }
  }

  // 2. If targetId not yet verified and targetNum is available, find by table_number
  if (!targetId && targetNum) {
    const cleanNum = targetNum.replace(/^(table|t-)\s*/i, '').trim();
    let q = supabase.from('restaurant_tables').select('id, table_number, business_id');
    if (resolvedBiz) q = q.eq('business_id', resolvedBiz);

    const orFilter = `table_number.eq.${targetNum},table_number.eq.Table ${targetNum},table_number.eq.T-${cleanNum},table_number.eq.${cleanNum}`;
    const { data: t } = await q.or(orFilter).limit(1).maybeSingle();

    if (t) {
      targetId = t.id;
      targetNum = t.table_number;
      if (!resolvedBiz) resolvedBiz = t.business_id;
    }
  }

  return { targetId, targetNum, resolvedBiz };
}


```

### lib/services/table/table-crud.service.ts (79 lines)
```typescript
import { invalidateTablesCache } from './get-tables.service';

export async function createHostTable(body: any, user: any, supabase: any) {
  let businessId = body.business_id || body.venue_id;
  if (!businessId && user) {
    const { data: business } = await supabase.from('businesses').select('id').eq('host_id', user.id).maybeSingle();
    if (business) businessId = business.id;
  }
  if (!businessId) {
    const { data: fallbackBiz } = await supabase.from('businesses').select('id').limit(1).maybeSingle();
    businessId = fallbackBiz?.id || 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
  }

  const { table_number, seating_capacity, location_id } = body;
  if (!table_number) throw new Error('table_number is required');

  const cleanNum = table_number.replace(/^(table|t-)\s*/i, '').trim();
  const formattedNum = `T-${cleanNum.padStart(2, '0')}`;
  const slug = `${businessId.slice(0, 8)}-${formattedNum.toLowerCase().replace(/\s+/g, '-')}`;

  const { data: table, error: insertError } = await supabase
    .from('restaurant_tables')
    .insert({
      business_id: businessId,
      location_id: location_id || null,
      table_number: formattedNum,
      seating_capacity: seating_capacity || 4,
      status: 'VACANT',
      is_active: true,
      qr_code_slug: slug,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[createHostTable error]', insertError);
    throw insertError;
  }

  try {
    await supabase.from('tables').upsert({
      venue_id: businessId,
      table_number: formattedNum,
      capacity: seating_capacity || 4,
      status: 'vacant',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'venue_id,table_number' });
  } catch (syncErr) {
    console.warn('[createHostTable tables sync note]', syncErr);
  }

  invalidateTablesCache(businessId);
  return { table };
}

export async function deleteHostTable(body: any, user: any, supabase: any) {
  let businessId = body.business_id || body.venue_id;
  if (!businessId && user) {
    const { data: business } = await supabase.from('businesses').select('id').eq('host_id', user.id).maybeSingle();
    if (business) businessId = business.id;
  }

  const { id } = body;
  if (!id) throw new Error('Table id is required for deactivation');

  let q = supabase.from('restaurant_tables').update({ is_active: false }).eq('id', id);
  if (businessId) q = q.eq('business_id', businessId);

  const { error } = await q;
  if (error) {
    console.error('[deleteHostTable error]', error);
    throw error;
  }

  invalidateTablesCache(businessId);
  return { success: true };
}


```

### lib/services/table/table-occupancy.util.ts (38 lines)
```typescript
import { normalizeTable } from '../session/session-entry.util';

export function deriveTableOccupancy(tables: any[], inMemOrders: any[], dbOrders: any[], supabase: any) {
  const activeOrderMap = new Map<string, any>();
  for (const ord of inMemOrders) {
    const norm = normalizeTable(ord.table_number);
    if (norm) activeOrderMap.set(norm, ord);
  }
  for (const ord of dbOrders) {
    const norm = normalizeTable(ord.table_number);
    if (norm && !activeOrderMap.has(norm)) activeOrderMap.set(norm, ord);
    if (ord.table_id && !activeOrderMap.has(ord.table_id)) activeOrderMap.set(ord.table_id, ord);
  }

  return (tables || []).map((t: any) => {
    const norm = normalizeTable(t.table_number);
    const activeOrd = activeOrderMap.get(norm) || (t.id ? activeOrderMap.get(t.id) : null);
    const hasActiveOrder = !!activeOrd;
    const subtotal = activeOrd ? Number(activeOrd.subtotal) || Number(activeOrd.grand_total) || 0 : 0;
    const rawStatus = (t.status || 'VACANT').toUpperCase();
    const storedStatus = ['VACANT', 'OCCUPIED', 'RESERVED', 'CLEANING'].includes(rawStatus) ? rawStatus : 'VACANT';
    // If table has an active order, it is always OCCUPIED. Otherwise, preserve the host's stored status.
    const derivedStatus = hasActiveOrder ? 'OCCUPIED' : storedStatus;

    if (hasActiveOrder && t.status !== 'OCCUPIED') {
      supabase.from('restaurant_tables').update({ status: 'OCCUPIED' }).eq('id', t.id).then(() => { }).catch(() => { });
    }

    return {
      ...t,
      status: derivedStatus,
      running_subtotal: subtotal,
      active_order_id: activeOrd?.id || null,
    };
  });
}


```

### lib/services/table/update-table.service.ts (130 lines)
```typescript
import { settleAndVacateSession } from '../session/settle-session.service';
import { resolveTargetTable } from './resolve-table.util';
import { invalidateTablesCache } from './get-tables.service';

export async function updateHostTable(body: any, user: any, supabase: any) {
  let businessId: string | null = body.business_id || body.venue_id || null;

  if (!businessId && user) {
    const { data: business } = await supabase.from('businesses').select('id').eq('host_id', user.id).maybeSingle();
    if (business) businessId = business.id;
  }
  if (!businessId) {
    const { data: fallbackBiz } = await supabase.from('businesses').select('id').limit(1).maybeSingle();
    businessId = fallbackBiz?.id || 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
  }

  const { id, table_number, status, is_active, seating_capacity } = body;
  if (!id && !table_number) throw new Error('Table id or table_number is required');

  const updatePayload: Record<string, any> = {};
  let normalizedStatus: string | undefined = undefined;

  if (status !== undefined) {
    normalizedStatus = String(status).toUpperCase();
    if (!['VACANT', 'OCCUPIED', 'RESERVED', 'CLEANING'].includes(normalizedStatus)) {
      normalizedStatus = 'VACANT';
    }
    updatePayload.status = normalizedStatus;
  }
  if (is_active !== undefined) updatePayload.is_active = Boolean(is_active);
  if (seating_capacity !== undefined) updatePayload.seating_capacity = Number(seating_capacity) || 4;

  const { targetId, targetNum, resolvedBiz } = await resolveTargetTable(supabase, businessId, id, table_number);
  const resolvedBizId: string = resolvedBiz || businessId || 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';

  let updatedTable: any = null;

  // 1. Try updating by verified targetId
  if (targetId) {
    const { data, error } = await supabase
      .from('restaurant_tables')
      .update(updatePayload)
      .eq('id', targetId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[updateHostTable Error Updating by ID]', error);
      throw new Error(`Failed to update table in database: ${error.message}`);
    }
    if (data) updatedTable = data;
  }

  // 2. Fallback: update by businessId and table_number if ID update didn't match
  if (!updatedTable && targetNum) {
    const cleanNum = targetNum.replace(/^(table|t-)\s*/i, '').trim();
    const orFilter = `table_number.eq.${targetNum},table_number.eq.Table ${targetNum},table_number.eq.T-${cleanNum},table_number.eq.${cleanNum}`;
    const { data, error } = await supabase
      .from('restaurant_tables')
      .update(updatePayload)
      .eq('business_id', resolvedBizId)
      .or(orFilter)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[updateHostTable Error Updating by Number]', error);
      throw new Error(`Failed to update table by number in database: ${error.message}`);
    }
    if (data) updatedTable = data;
  }

  // 3. Fallback: if table doesn't exist yet, insert / upsert it
  if (!updatedTable && targetNum) {
    const cleanNum = targetNum.replace(/^(table|t-)\s*/i, '').trim();
    const formattedNum = `T-${cleanNum.padStart(2, '0')}`;
    const slug = `${resolvedBizId.slice(0, 8)}-${formattedNum.toLowerCase()}`;
    const { data, error } = await supabase
      .from('restaurant_tables')
      .insert({
        business_id: resolvedBizId,
        table_number: formattedNum,
        seating_capacity: seating_capacity || 4,
        status: normalizedStatus || 'VACANT',
        is_active: is_active !== undefined ? Boolean(is_active) : true,
        qr_code_slug: slug,
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('[updateHostTable Error Inserting Table]', error);
      throw new Error(`Failed to create/upsert table in database: ${error.message}`);
    }
    if (data) updatedTable = data;
  }

  if (!updatedTable) {
    throw new Error(`Could not find or update table ${table_number || id} for venue ${resolvedBizId}`);
  }

  // 4. Also mirror changes to dedicated public.tables if it exists
  try {
    const tableNum = updatedTable.table_number || targetNum;
    await supabase.from('tables').upsert({
      venue_id: resolvedBizId,
      table_number: tableNum,
      capacity: updatedTable.seating_capacity || 4,
      status: (updatedTable.status || 'vacant').toLowerCase(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'venue_id,table_number' });
  } catch (syncErr) {
    console.warn('[updateHostTable public.tables sync note]', syncErr);
  }

  // 5. Invalidate cache to guarantee fresh state on immediate re-fetch
  invalidateTablesCache(resolvedBizId);

  // 6. Clear sessions if marked VACANT
  if (normalizedStatus === 'VACANT') {
    await settleAndVacateSession({ table_id: updatedTable.id, table_number: updatedTable.table_number, business_id: resolvedBizId }, supabase);
  }

  return {
    success: true,
    table: updatedTable,
  };
}


```

### lib/services/wallet/cashback-ledger.util.ts (78 lines)
```typescript
// lib/services/wallet/cashback-ledger.util.ts

export interface CashbackCreditPayload {
  business_id?: string | null;
  cafe_id?: string | null;
  cafe_name?: string | null;
  guest_id: string;
  guest_name?: string | null;
  guest_handle?: string | null;
  customer_phone?: string | null;
  guest_session_id?: string | null;
  order_id?: string | null;
  order_total: number;
  table_number?: string | null;
}

export interface WalletTransactionRecord {
  id: string;
  wallet_id: string;
  guest_id: string;
  cafe_id?: string | null;
  cafe_name?: string | null;
  table_number?: string | null;
  order_id: string | null;
  transaction_type: 'CASHBACK' | 'REDEMPTION' | 'ADJUSTMENT';
  rate: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  created_at: string;
}

export interface GuestWalletRecord {
  id: string;
  guest_id: string;
  business_id: string;
  cafe_id?: string | null;
  cafe_name?: string | null;
  balance: number;
  total_cashback_earned: number;
  updated_at: string;
}

export const inMemoryWallets = new Map<string, GuestWalletRecord>();
export const inMemoryTransactions = new Map<string, WalletTransactionRecord[]>();

export function calculateCashback(orderAmount: number): number {
  if (!orderAmount || orderAmount <= 0) return 0;
  return Math.round(Number(orderAmount) * 0.07 * 100) / 100;
}

export function getOrCreateMemoryWallet(guestId: string, businessId: string, cafeName?: string | null): GuestWalletRecord {
  const key = `${guestId}_${businessId}`;
  let wallet = inMemoryWallets.get(key);
  if (!wallet) {
    wallet = {
      id: `wlt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      guest_id: guestId,
      business_id: businessId,
      cafe_id: businessId,
      cafe_name: cafeName || null,
      balance: 0,
      total_cashback_earned: 0,
      updated_at: new Date().toISOString(),
    };
    inMemoryWallets.set(key, wallet);
  } else if (cafeName && !wallet.cafe_name) {
    wallet.cafe_name = cafeName;
  }
  return wallet;
}

export function recordMemoryTx(walletId: string, tx: WalletTransactionRecord) {
  const txs = inMemoryTransactions.get(walletId) || [];
  inMemoryTransactions.set(walletId, [tx, ...txs]);
}

```

### lib/services/wallet/cashback.service.ts (286 lines)
```typescript
// lib/services/wallet/cashback.service.ts
import {
  CashbackCreditPayload,
  calculateCashback,
  getOrCreateMemoryWallet,
  recordMemoryTx,
  inMemoryWallets,
  inMemoryTransactions,
  WalletTransactionRecord,
  GuestWalletRecord,
} from './cashback-ledger.util';

export * from './cashback-ledger.util';

const IS_UUID = (v: any) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export async function creditOrderCashback(supabase: any, payload: CashbackCreditPayload) {
  const { business_id, cafe_id, cafe_name: incomingCafeName, guest_id, guest_handle, customer_phone, guest_session_id, guest_name, order_id, order_total, table_number } = payload;
  const targetCashback = calculateCashback(order_total);
  const resolvedBiz = business_id || cafe_id || 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
  const nowIso = new Date().toISOString();
  if (targetCashback <= 0) return { success: false, reason: 'Invalid order total' };

  let resolvedCafeName = incomingCafeName || null;
  if (!resolvedCafeName && supabase && IS_UUID(resolvedBiz)) {
    try {
      const { data: b } = await supabase.from('businesses').select('name').eq('id', resolvedBiz).maybeSingle();
      if (b?.name) resolvedCafeName = b.name;
    } catch {}
  }

  const validIdentifiers = Array.from(
    new Set(
      [guest_handle, customer_phone, guest_session_id, guest_name, guest_id]
        .filter((id): id is string => Boolean(id && typeof id === 'string' && id.trim().length > 0 && id !== 'Guest' && id !== 'gst-current'))
    )
  );
  if (validIdentifiers.length === 0) validIdentifiers.push(guest_id || 'gst-current');
  const primaryGuestId = validIdentifiers[0];

  // Calculate cashback already credited for this order (both in-memory and database)
  let alreadyCredited = 0;
  if (order_id) {
    for (const vid of validIdentifiers) {
      const existingW = inMemoryWallets.get(`${vid}_${resolvedBiz}`);
      if (existingW) {
        const matchingTxs = (inMemoryTransactions.get(existingW.id) || []).filter(
          (t) => t.order_id === order_id && t.transaction_type === 'CASHBACK'
        );
        const sumMem = matchingTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);
        if (sumMem > alreadyCredited) alreadyCredited = sumMem;
      }
    }
    if (supabase && IS_UUID(order_id)) {
      try {
        const { data: dbTxs } = await supabase
          .from('wallet_transactions')
          .select('amount')
          .eq('order_id', order_id)
          .eq('transaction_type', 'CASHBACK');
        if (dbTxs && dbTxs.length > 0) {
          const sumDb = dbTxs.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
          if (sumDb > alreadyCredited) alreadyCredited = sumDb;
        }
      } catch (e) {
        console.warn('[DB Existing Tx Check Note]:', e);
      }
    }
  }

  const netCashback = Math.max(0, Math.round((targetCashback - alreadyCredited) * 100) / 100);
  if (netCashback <= 0) {
    const memW = getOrCreateMemoryWallet(primaryGuestId, resolvedBiz, resolvedCafeName);
    return {
      success: true,
      cashback_amount: 0,
      already_credited: alreadyCredited,
      target_cashback: targetCashback,
      wallet: memW,
      idempotent: true,
      message: 'Cashback already credited on total bill',
    };
  }

  const cashback = netCashback;

  let dbWallet: any = null;
  if (supabase) {
    try {
      const { data: matched } = await supabase
        .from('guest_wallets')
        .select('*')
        .or(`business_id.eq.${resolvedBiz},cafe_id.eq.${resolvedBiz}`)
        .in('guest_id', validIdentifiers)
        .order('balance', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (matched) dbWallet = matched;
    } catch (e) {
      console.warn('[DB Wallet Find Note]:', e);
    }
  }

  const activeWalletId = dbWallet?.guest_id || primaryGuestId;
  const before = dbWallet ? Number(dbWallet.balance || 0) : (inMemoryWallets.get(`${primaryGuestId}_${resolvedBiz}`)?.balance || 0);
  const after = Math.round((before + cashback) * 100) / 100;

  const memWallet = getOrCreateMemoryWallet(primaryGuestId, resolvedBiz, resolvedCafeName);
  memWallet.balance = after;
  memWallet.total_cashback_earned = Math.round((memWallet.total_cashback_earned + cashback) * 100) / 100;
  memWallet.cafe_id = resolvedBiz;
  if (resolvedCafeName) memWallet.cafe_name = resolvedCafeName;
  memWallet.updated_at = nowIso;
  for (const vid of validIdentifiers) {
    inMemoryWallets.set(`${vid}_${resolvedBiz}`, memWallet);
  }

  const venueLabel = resolvedCafeName || 'Cafe';
  const tableLabel = table_number ? ` • Table ${table_number}` : '';
  const descLabel = alreadyCredited > 0
    ? `7% incremental cashback on ${venueLabel}${tableLabel} (Add-on delta)`
    : `7% cashback on ${venueLabel}${tableLabel}`;

  const tx: WalletTransactionRecord = {
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    wallet_id: dbWallet?.id || memWallet.id,
    guest_id: activeWalletId,
    cafe_id: resolvedBiz,
    cafe_name: resolvedCafeName,
    table_number: table_number || null,
    order_id: order_id || null,
    transaction_type: 'CASHBACK',
    rate: '7%',
    amount: cashback,
    balance_before: before,
    balance_after: after,
    description: descLabel,
    created_at: nowIso,
  };
  recordMemoryTx(memWallet.id, tx);

  if (supabase) {
    try {
      let dbWId = dbWallet?.id;
      if (!dbWallet) {
        const { data: nW } = await supabase.from('guest_wallets')
          .insert({
            guest_id: activeWalletId,
            business_id: resolvedBiz,
            cafe_id: resolvedBiz,
            cafe_name: resolvedCafeName,
            balance: cashback,
            total_cashback_earned: cashback,
          })
          .select().maybeSingle();
        dbWId = nW?.id;
      } else {
        await supabase.from('guest_wallets').update({
          balance: Number(dbWallet.balance || 0) + cashback,
          total_cashback_earned: Number(dbWallet.total_cashback_earned || 0) + cashback,
          cafe_id: resolvedBiz,
          ...(resolvedCafeName ? { cafe_name: resolvedCafeName } : {}),
          updated_at: nowIso,
        }).eq('id', dbWallet.id);
      }
      if (dbWId) {
        recordMemoryTx(dbWId, tx);
        await supabase.from('wallet_transactions').insert({
          wallet_id: dbWId,
          guest_id: activeWalletId,
          order_id: IS_UUID(order_id) ? order_id : null,
          cafe_id: resolvedBiz,
          cafe_name: resolvedCafeName,
          table_number: table_number || null,
          transaction_type: 'CASHBACK',
          rate: '7%',
          amount: cashback,
          balance_before: before,
          balance_after: after,
          description: tx.description,
        });
      }
    } catch (e) { console.warn('[Wallet DB Sync Note]:', e); }
  }
  return { success: true, cashback_amount: cashback, already_credited: alreadyCredited, target_cashback: targetCashback, wallet: memWallet, transaction: tx };
}

export async function getGuestWallet(supabase: any, guestId: string, businessId?: string, extraIdentifiers: string[] = []) {
  const resolvedBiz = businessId || 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
  const candidateIds = Array.from(new Set([guestId, ...extraIdentifiers].filter((id): id is string => Boolean(id && typeof id === 'string' && id.trim().length > 0 && id !== 'Guest'))));
  if (candidateIds.length === 0) candidateIds.push(guestId || 'gst-current');

  if (supabase) {
    try {
      // 1. Fetch candidate wallets for the specific cafe
      const { data: cafeWalletData } = await supabase
        .from('guest_wallets')
        .select('*')
        .or(`business_id.eq.${resolvedBiz},cafe_id.eq.${resolvedBiz}`)
        .in('guest_id', candidateIds)
        .order('balance', { ascending: false })
        .limit(1)
        .maybeSingle();

      // 2. Fetch all wallets for candidate IDs across venues
      const { data: allWallets } = await supabase
        .from('guest_wallets')
        .select('*')
        .in('guest_id', candidateIds);

      const resolvedWallet = cafeWalletData || (businessId ? null : allWallets?.[0]) || null;
      const allWalletIds = (allWallets || []).map((w: any) => w.id).filter(Boolean);

      let txs: any[] = [];
      if (allWalletIds.length > 0) {
        const { data: dbTxs } = await supabase
          .from('wallet_transactions')
          .select('*')
          .in('wallet_id', allWalletIds)
          .order('created_at', { ascending: false });
        txs = dbTxs || [];
      }

      if (resolvedWallet) {
        const cafeName = resolvedWallet.cafe_name || (await getCafeName(supabase, resolvedBiz));
        const filteredTxs = txs.filter((t: any) => !t.cafe_id || t.cafe_id === resolvedBiz || t.wallet_id === resolvedWallet.id);
        const memTxs = inMemoryTransactions.get(resolvedWallet.id) || [];
        const mergedTxs = (filteredTxs.length > 0 ? filteredTxs : memTxs).map((t: any) => ({
          ...t,
          cafe_id: t.cafe_id || resolvedBiz,
          cafe_name: t.cafe_name || cafeName,
        }));

        const globalBalance = (allWallets || []).reduce((sum: number, w: any) => sum + Number(w.balance || 0), 0);
        return {
          success: true,
          wallet: {
            id: resolvedWallet.id,
            guest_id: resolvedWallet.guest_id,
            business_id: resolvedWallet.business_id || resolvedBiz,
            cafe_id: resolvedWallet.cafe_id || resolvedBiz,
            cafe_name: cafeName,
            balance: Number(resolvedWallet.balance || 0),
            total_cashback_earned: Number(resolvedWallet.total_cashback_earned || 0),
            updated_at: resolvedWallet.updated_at,
          },
          transactions: mergedTxs,
          cafe_wallets: allWallets || [],
          global_balance: globalBalance,
        };
      }
    } catch (e) {
      console.warn('[getGuestWallet DB query failed]:', e);
    }
  }

  // In-memory fallback
  for (const cid of candidateIds) {
    const mem = inMemoryWallets.get(`${cid}_${resolvedBiz}`);
    if (mem) {
      const allMems = Array.from(inMemoryWallets.values()).filter((w) => candidateIds.includes(w.guest_id));
      const globalBalance = allMems.reduce((sum, w) => sum + Number(w.balance || 0), 0);
      return {
        success: true,
        wallet: mem,
        transactions: inMemoryTransactions.get(mem.id) || [],
        cafe_wallets: allMems,
        global_balance: globalBalance,
      };
    }
  }

  const mem = inMemoryWallets.get(`${guestId}_${resolvedBiz}`) || getOrCreateMemoryWallet(candidateIds[0] || guestId, resolvedBiz);
  return { success: true, wallet: mem, transactions: inMemoryTransactions.get(mem.id) || [], global_balance: mem.balance, cafe_wallets: [mem] };
}

async function getCafeName(supabase: any, bizId: string): Promise<string | null> {
  if (!supabase || !IS_UUID(bizId)) return null;
  try {
    const { data } = await supabase.from('businesses').select('name').eq('id', bizId).maybeSingle();
    return data?.name || null;
  } catch {
    return null;
  }
}

```

### lib/services/wallet/fee-guard.service.ts (185 lines)
```typescript
import type { FeeGuardAction, FeeGuardResult } from '@/types/wallet';
import { getOrProvisionVenueWallet, getVenuePendingTopup } from './venue-wallet.service';

// ── Fee schedule ─────────────────────────────────────────────────────────────
const FEE: Record<FeeGuardAction, (subscribed: boolean) => number> = {
  bill_generate:       (s) => (s ? 0 : 3.00),
  menu_addon:          () => 0.00,  // Services & Add-ons are completely FREE (₹0.00)
  menu_addon_creation: () => 0.00,  // Services & Add-ons are completely FREE (₹0.00)
  room_accommodation:  (s) => (s ? 0 : 10.00),
  menu_item_creation:  (s) => (s ? 0 : 2.00),
  room_creation:       (s) => (s ? 0 : 10.00), // Exactly ₹10.00 for room creation
  onboarding_free_tier:() => 0,
};

/** Generate QC-YYYY-XXXX when no real order ID is available */
export function generateInvoiceRef(): string {
  const yr = new Date().getFullYear();
  const seq = Math.floor(1000 + Math.random() * 9000);
  return `QC-${yr}-${seq}`;
}

/** Derive a consistent invoice ref from a raw UUID order/session ID */
export function invoiceRefFromId(rawId: string): string {
  const yr = new Date().getFullYear();
  const short = rawId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `QC-${yr}-${short}`;
}

function actionLabel(a: FeeGuardAction, ref: string): string {
  if (a === 'bill_generate')       return `POS Bill Settlement (${ref})`;
  if (a === 'menu_addon')          return `Menu Add-on Ingestion (${ref})`;
  if (a === 'menu_item_creation')  return `Menu Item Creation (${ref})`;
  if (a === 'menu_addon_creation') return `Menu Add-on Creation (${ref})`;
  if (a === 'room_creation')       return `Room / Accommodation Creation (${ref})`;
  if (a === 'onboarding_free_tier')return `Onboarding Free Tier Setup (${ref})`;
  return `Room Stay Ingestion (${ref})`;
}

/**
 * evaluateFeeGuard
 *
 * PATH A — wallet balance sufficient:
 *   1. Try atomic RPC `deduct_venue_wallet_credits`
 *   2. On RPC failure → manual wallet update + usage_ledger insert
 *   → allowed: true, method: 'wallet_deduction'
 *
 * PATH B — wallet balance insufficient:
 *   1. Insert into `venue_outstanding_bills` with exact invoiceRef & status 'unpaid'
 *   → allowed: true, method: 'outstanding_fallback'  ← POS is NEVER blocked
 *
 * Both paths emit a console.log for terminal traceability.
 */
export async function evaluateFeeGuard(
  venueId: string,
  actionType: FeeGuardAction,
  referenceId?: string,
  supabaseClient?: any,
  overrideCost?: number,
): Promise<FeeGuardResult> {
  if (!supabaseClient) {
    console.warn('[FeeGuard] No supabaseClient provided — skipping fee check');
    return { allowed: true, cost: 0 };
  }

  const data = await getOrProvisionVenueWallet(supabaseClient, venueId);
  if (!data) return { allowed: true, cost: 0 };

  const { subscription, wallet } = data;
  const pending = await getVenuePendingTopup(supabaseClient, venueId);
  const isSubscribed =
    !pending &&
    (subscription.status === 'active' || subscription.status === 'trial') &&
    subscription.plan_tier !== 'pay_as_you_go';

  const baseCost = FEE[actionType]?.(isSubscribed) ?? 0;
  const cost = overrideCost !== undefined ? (isSubscribed ? 0 : overrideCost) : baseCost;

  // Subscribed plans or free items — bill settlement is free
  if (cost === 0) {
    console.log('[FeeGuard Executed]', { venueId, actionType, invoiceRef: referenceId || 'n/a', cost: 0, method: 'free_tier' });
    return { allowed: true, cost: 0, planTier: subscription.plan_tier };
  }

  const currentBalance = Number(wallet.balance ?? 0);
  const invoiceRef = referenceId
    ? (referenceId.startsWith('QC-') || referenceId.startsWith('TOPUP_') || referenceId.startsWith('SETTLE_')
        ? referenceId
        : invoiceRefFromId(referenceId))
    : generateInvoiceRef();
  const nowIso = new Date().toISOString();

  console.log('[FeeGuard Executed]', { venueId, actionType, invoiceRef, cost, currentBalance, planTier: subscription.plan_tier });

  // ── PATH A: sufficient balance → deduct atomically ───────────────────────
  if (currentBalance >= cost) {
    const newBalance = currentBalance - cost;
    let rpcOk = false;

    // Try atomic Supabase RPC first
    try {
      const { data: rpcRes, error: rpcErr } = await supabaseClient.rpc(
        'deduct_venue_wallet_credits',
        { p_venue_id: venueId, p_amount: cost, p_action_type: actionType, p_reference_id: invoiceRef },
      );
      if (!rpcErr && rpcRes?.success !== false) {
        rpcOk = true;
        console.log('[FeeGuard] PATH A — RPC deduction successful', { invoiceRef, newBalance: rpcRes?.new_balance ?? newBalance });
      }
    } catch {}

    // Manual fallback if RPC failed
    if (!rpcOk) {
      try {
        await supabaseClient
          .from('venue_wallets')
          .update({ balance: newBalance, updated_at: nowIso })
          .eq('venue_id', venueId);
        await supabaseClient.from('usage_ledger').insert({
          venue_id: venueId,
          action_type: actionType,
          cost,
          reference_id: invoiceRef,
        });
        console.log('[FeeGuard] PATH A — Manual fallback deduction', { invoiceRef, newBalance });
      } catch (fallbackErr) {
        console.error('[FeeGuard] PATH A fallback failed:', fallbackErr);
      }
    }

    wallet.balance = newBalance;
    return { allowed: true, cost, remainingBalance: newBalance, planTier: subscription.plan_tier };
  }

  // ── PATH B: insufficient → log to outstanding (POS never blocked) ─────────
  console.log('[FeeGuard] PATH B — Insufficient balance, logging to outstanding_bills', { invoiceRef, cost, currentBalance });
  try {
    const dbItemType = (['bill_generate', 'menu_addon', 'room_accommodation'].includes(actionType))
      ? actionType
      : (actionType === 'room_creation' ? 'room_accommodation' : (actionType === 'menu_item_creation' || actionType === 'menu_addon_creation' ? 'menu_addon' : 'other'));

    const { error: insErr } = await supabaseClient.from('venue_outstanding_bills').insert({
      venue_id: venueId,
      reference_id: invoiceRef,
      description: actionLabel(actionType, invoiceRef),
      item_type: dbItemType,
      amount: cost,
      status: 'unpaid',
    });
    if (insErr) throw insErr;
    console.log('[FeeGuard] Outstanding bill inserted OK', { invoiceRef, amount: cost });
  } catch (e) {
    console.error('[FeeGuard] CRITICAL — Failed to log outstanding bill:', e);
  }

  return {
    allowed: true,
    cost,
    remainingBalance: currentBalance,
    planTier: subscription.plan_tier,
    message: `Wallet ₹${currentBalance.toFixed(2)} < ₹${cost.toFixed(2)}. Added to outstanding (${invoiceRef}).`,
  };
}

/**
 * processVenueFee
 * Convenience wrapper adhering to requested pipeline signature:
 * processVenueFee(venueId, actionType, cost, referenceId, supabaseClient)
 */
export async function processVenueFee(
  venueId: string,
  actionType: FeeGuardAction,
  cost?: number,
  referenceId?: string,
  supabaseClient?: any,
): Promise<FeeGuardResult> {
  let client = supabaseClient;
  if (!client) {
    try {
      const { createClient } = await import('@/lib/supabase/server');
      client = createClient();
    } catch {}
  }
  return evaluateFeeGuard(venueId, actionType, referenceId, client, cost);
}

```

### lib/services/wallet/free-tier.service.ts (136 lines)
```typescript
/**
 * free-tier.service.ts
 *
 * Centralises all free-tier threshold logic for Pay-As-You-Go venues.
 *
 * FREE THRESHOLDS (per venue, lifetime count in catalog_items):
 *   food / service items  → first 10 free  → then ₹2.00 per item (menu_item_creation)
 *   room items            → first 2 free   → then ₹5.00 per item (room_creation)
 *
 * Returns:
 *   { isFree: true }          → log 'onboarding_free_tier', skip fee guard
 *   { isFree: false, cost }   → invoke evaluateFeeGuard with the returned cost
 */

import type { FeeGuardAction } from '@/types/wallet';

export const FREE_TIER = {
  menu: { threshold: 10, cost: 2.00, action: 'menu_item_creation' as FeeGuardAction },
  room: { threshold: 2,  cost: 10.00, action: 'room_creation'      as FeeGuardAction },
} as const;

export type FreeTierKey = keyof typeof FREE_TIER;

/**
 * Returns true if an item is a service or addon, which are 100% free (₹0.00)
 * and completely bypass Pay-As-You-Go fees and quota counting.
 */
export function isFreeItemType(itemType?: string, category?: string): boolean {
  if (!itemType && !category) return false;
  const t = (itemType || '').toLowerCase().trim();
  const c = (category || '').toLowerCase().trim();
  return (
    t === 'service' ||
    t === 'addon' ||
    t === 'menu_addon' ||
    c === 'service' ||
    c === 'services' ||
    c === 'addon' ||
    c === 'add-on' ||
    c === 'addons' ||
    c === 'add-ons'
  );
}

export interface FreeTierResult {
  isFree: boolean;
  existingCount: number;
  threshold: number;
  cost: number;
  action: FeeGuardAction;
}

/**
 * Check whether the next catalog/room creation is within the free-tier quota.
 *
 * @param supabase   — server-side Supabase client
 * @param businessId — venue's business_id
 * @param kind       — 'menu' (food/beverage) or 'room'
 */
export async function checkFreeTier(
  supabase: any,
  businessId: string,
  kind: FreeTierKey,
): Promise<FreeTierResult> {
  const cfg = FREE_TIER[kind];
  let existingCount = 0;

  try {
    if (kind === 'room') {
      // 1. Check rooms table
      const { count: roomsCount } = await supabase
        .from('rooms')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId);

      // 2. Check catalog_items table for room types
      const { count: catalogRoomsCount } = await supabase
        .from('catalog_items')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .in('item_type', ['room', 'room_accommodation']);

      existingCount = Math.max(roomsCount ?? 0, catalogRoomsCount ?? 0);
    } else {
      // Only standard menu items (food/beverage) count toward the first-10 menu free threshold.
      // Services and add-ons are completely excluded.
      const { count: catalogCount } = await supabase
        .from('catalog_items')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .in('item_type', ['food', 'beverage']);

      const { count: menuCount } = await supabase
        .from('menu_items')
        .select('id', { count: 'exact', head: true })
        .or(`business_id.eq.${businessId},cafe_id.eq.${businessId}`);

      existingCount = Math.max(catalogCount ?? 0, menuCount ?? 0);
    }
  } catch (e) {
    console.error('[FreeTier] Count query failed — defaulting to charged:', e);
    existingCount = cfg.threshold; // fail-safe
  }

  return {
    isFree: existingCount < cfg.threshold,
    existingCount,
    threshold: cfg.threshold,
    cost: cfg.cost,
    action: cfg.action,
  };
}

/**
 * Log a free-tier onboarding event to usage_ledger (₹0 cost, informational only).
 */
export async function logFreeTierUsage(
  supabase: any,
  businessId: string,
  action: FeeGuardAction,
  referenceId: string,
): Promise<void> {
  try {
    await supabase.from('usage_ledger').insert({
      venue_id: businessId,
      action_type: 'onboarding_free_tier',
      cost: 0,
      reference_id: referenceId,
      metadata: { free_tier_action: action },
    });
    console.log('[FreeTier] Onboarding free-tier logged', { businessId, action, referenceId });
  } catch (e) {
    console.error('[FreeTier] Failed to log free-tier usage:', e);
  }
}

```

### lib/services/wallet/redemption-store.util.ts (41 lines)
```typescript
// lib/services/wallet/redemption-store.util.ts
export type RedemptionStatus = 'pending' | 'verified' | 'redeemed' | 'cancelled' | 'expired';

export interface RedemptionRecord {
  id: string;
  code: string;
  wallet_id?: string;
  guest_id: string;
  guest_handle?: string;
  guest_phone?: string;
  guest_name?: string;
  business_id: string;
  cafe_id: string;
  table_number?: string;
  amount: number;
  status: RedemptionStatus;
  verified_at?: string;
  redeemed_at?: string;
  order_id?: string;
  created_at: string;
  expires_at: string;
}

// In-memory persistent map across Node requests in dev / fallback
declare global {
  // eslint-disable-next-line no-var
  var __quadInMemoryRedemptions: Map<string, RedemptionRecord> | undefined;
}

export const inMemoryRedemptions: Map<string, RedemptionRecord> =
  globalThis.__quadInMemoryRedemptions || new Map<string, RedemptionRecord>();

if (!globalThis.__quadInMemoryRedemptions) {
  globalThis.__quadInMemoryRedemptions = inMemoryRedemptions;
}

export function generateRedemptionCode(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `QC-RDM-${digits}`;
}

```

### lib/services/wallet/redemption.service.ts (335 lines)
```typescript
// lib/services/wallet/redemption.service.ts
import {
  RedemptionRecord,
  inMemoryRedemptions,
  generateRedemptionCode,
} from './redemption-store.util';
import { getGuestWallet } from './cashback.service';
import {
  inMemoryWallets,
  inMemoryTransactions,
  recordMemoryTx,
  WalletTransactionRecord,
} from './cashback-ledger.util';

const IS_UUID = (v: any) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export interface CreateRedemptionPayload {
  guest_id: string;
  guest_handle?: string;
  customer_phone?: string;
  guest_name?: string;
  business_id: string;
  cafe_id?: string;
  table_number?: string;
  amount?: number;
}

export async function createRedemptionRequest(supabase: any, payload: CreateRedemptionPayload) {
  const { guest_id, guest_handle, customer_phone, guest_name, business_id, cafe_id, table_number, amount: reqAmount } = payload;
  const resolvedBiz = business_id || cafe_id || 'aed7ace0-d1b5-4525-b5c6-403ad6fcc269';
  const cleanHandle = guest_handle ? (guest_handle.startsWith('@') ? guest_handle : `@${guest_handle}`) : undefined;
  const primaryId = cleanHandle || guest_id || customer_phone || 'gst-current';

  // 1. Fetch current wallet balance
  const walletRes = await getGuestWallet(supabase, primaryId, resolvedBiz, [
    cleanHandle,
    customer_phone,
    guest_name,
  ].filter(Boolean) as string[]);

  const currentBalance = Number(walletRes.wallet?.balance || 0);
  if (currentBalance <= 0) {
    return { success: false, error: 'Wallet balance is ₹0.00. No cashback available to redeem.' };
  }

  const redeemAmount = reqAmount && reqAmount > 0 ? Math.min(reqAmount, currentBalance) : currentBalance;
  if (redeemAmount <= 0) {
    return { success: false, error: 'Invalid redemption amount requested.' };
  }

  // 2. Check if an active pending code already exists for this guest at this venue
  for (const existing of Array.from(inMemoryRedemptions.values())) {
    if (
      (existing.guest_id === primaryId || (cleanHandle && existing.guest_handle === cleanHandle)) &&
      existing.cafe_id === resolvedBiz &&
      existing.status === 'pending' &&
      new Date(existing.expires_at).getTime() > Date.now()
    ) {
      existing.amount = redeemAmount;
      existing.table_number = table_number || existing.table_number;
      return { success: true, redemption: existing, is_existing: true };
    }
  }

  const code = generateRedemptionCode();
  const nowIso = new Date().toISOString();
  const expiresIso = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const record: RedemptionRecord = {
    id: `rdm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    code,
    wallet_id: walletRes.wallet?.id,
    guest_id: primaryId,
    guest_handle: cleanHandle,
    guest_phone: customer_phone,
    guest_name: guest_name,
    business_id: resolvedBiz,
    cafe_id: resolvedBiz,
    table_number: table_number || undefined,
    amount: Math.round(redeemAmount * 100) / 100,
    status: 'pending',
    created_at: nowIso,
    expires_at: expiresIso,
  };

  inMemoryRedemptions.set(code, record);

  if (supabase) {
    try {
      await supabase.from('wallet_redemptions').insert({
        code: record.code,
        wallet_id: IS_UUID(record.wallet_id) ? record.wallet_id : null,
        guest_id: record.guest_id,
        guest_handle: record.guest_handle,
        guest_phone: record.guest_phone,
        business_id: record.business_id,
        cafe_id: record.cafe_id,
        table_number: record.table_number,
        amount: record.amount,
        status: 'pending',
        created_at: record.created_at,
        expires_at: record.expires_at,
      });
    } catch (dbErr) {
      console.warn('[Wallet Redemption DB Note]:', dbErr);
    }
  }

  return { success: true, redemption: record };
}

export async function verifyRedemptionCode(
  supabase: any,
  payload: { code: string; business_id?: string; cafe_id?: string; table_number?: string }
) {
  const rawCode = (payload.code || '').trim().toUpperCase();
  if (!rawCode) return { success: false, error: 'Redemption code is required' };
  const resolvedBiz = payload.business_id || payload.cafe_id;

  let record: RedemptionRecord | null = inMemoryRedemptions.get(rawCode) || null;

  if (!record && supabase) {
    try {
      const { data: dbRec } = await supabase
        .from('wallet_redemptions')
        .select('*')
        .eq('code', rawCode)
        .maybeSingle();
      if (dbRec) record = dbRec;
    } catch {}
  }

  if (!record) {
    return { success: false, error: 'Invalid redemption code. Please check and try again.' };
  }

  // Idempotency check: Cannot be used more than once!
  if (record.status === 'redeemed') {
    return {
      success: false,
      error: 'This redemption code has already been redeemed and cannot be used again.',
      already_redeemed: true,
      redeemed_at: record.redeemed_at,
    };
  }

  if (record.status === 'cancelled') {
    return { success: false, error: 'This redemption code has been cancelled.' };
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    record.status = 'expired';
    return { success: false, error: 'Redemption code has expired. Please generate a new code.' };
  }

  // Check venue match if provided
  if (resolvedBiz && record.cafe_id && record.cafe_id !== resolvedBiz && record.business_id !== resolvedBiz) {
    return { success: false, error: 'This redemption code is not valid for this venue.' };
  }

  // Re-verify guest wallet balance
  const walletRes = await getGuestWallet(supabase, record.guest_id, record.cafe_id, [
    record.guest_handle,
    record.guest_phone,
  ].filter(Boolean) as string[]);

  const balance = Number(walletRes.wallet?.balance || 0);
  if (balance < record.amount) {
    return {
      success: false,
      error: `Insufficient wallet balance. Code requested ₹${record.amount}, but wallet only has ₹${balance}.`,
    };
  }

  // Atomically update status to verified
  const nowIso = new Date().toISOString();
  record.status = 'verified';
  record.verified_at = nowIso;
  if (payload.table_number) record.table_number = payload.table_number;
  inMemoryRedemptions.set(rawCode, record);

  if (supabase) {
    try {
      await supabase
        .from('wallet_redemptions')
        .update({ status: 'verified', verified_at: nowIso, table_number: record.table_number })
        .eq('code', rawCode);
    } catch {}
  }

  return {
    success: true,
    message: `Redemption code ${rawCode} verified successfully! ₹${record.amount} discount applied.`,
    redemption: record,
    amount: record.amount,
    guest_handle: record.guest_handle,
    guest_name: record.guest_name,
    table_number: record.table_number,
  };
}

export async function finalizeRedemptionExecution(
  supabase: any,
  payload: {
    code: string;
    order_id?: string;
    table_number?: string;
    business_id?: string;
    settled_total?: number;
  }
) {
  const rawCode = (payload.code || '').trim().toUpperCase();
  if (!rawCode) return { success: false, error: 'Missing redemption code' };

  let record: RedemptionRecord | null = inMemoryRedemptions.get(rawCode) || null;
  if (!record && supabase) {
    try {
      const { data: dbRec } = await supabase
        .from('wallet_redemptions')
        .select('*')
        .eq('code', rawCode)
        .maybeSingle();
      if (dbRec) record = dbRec;
    } catch {}
  }

  if (!record) return { success: false, error: 'Redemption record not found' };

  // Idempotency: Do not deduct twice!
  if (record.status === 'redeemed') {
    return { success: true, already_redeemed: true, amount: record.amount };
  }

  const nowIso = new Date().toISOString();
  const deductAmount = record.amount;
  const resolvedBiz = payload.business_id || record.business_id || record.cafe_id;

  // 1. Fetch current wallet
  const walletRes = await getGuestWallet(supabase, record.guest_id, resolvedBiz, [
    record.guest_handle,
    record.guest_phone,
  ].filter(Boolean) as string[]);

  let dbWallet = walletRes.wallet;
  const before = Number(dbWallet?.balance || 0);
  const after = Math.max(0, Math.round((before - deductAmount) * 100) / 100);

  // 2. Mark redemption record redeemed
  record.status = 'redeemed';
  record.redeemed_at = nowIso;
  record.order_id = payload.order_id;
  inMemoryRedemptions.set(rawCode, record);

  // 3. Update memory wallet
  const memWallet = inMemoryWallets.get(`${record.guest_id}_${resolvedBiz}`) || {
    id: `wlt-${record.guest_id}`,
    guest_id: record.guest_id,
    business_id: resolvedBiz,
    cafe_id: resolvedBiz,
    balance: after,
    total_cashback_earned: Number(dbWallet?.total_cashback_earned || 0),
    updated_at: nowIso,
  };
  memWallet.balance = after;
  memWallet.updated_at = nowIso;
  inMemoryWallets.set(`${record.guest_id}_${resolvedBiz}`, memWallet);
  if (record.guest_handle) inMemoryWallets.set(`${record.guest_handle}_${resolvedBiz}`, memWallet);

  const tx: WalletTransactionRecord = {
    id: `tx-rdm-${Date.now()}`,
    wallet_id: dbWallet?.id || memWallet.id,
    guest_id: record.guest_id,
    cafe_id: resolvedBiz,
    table_number: payload.table_number || record.table_number || null,
    order_id: payload.order_id || null,
    transaction_type: 'REDEMPTION',
    rate: '100%',
    amount: deductAmount,
    balance_before: before,
    balance_after: after,
    description: `Redeemed ₹${deductAmount} on Table ${payload.table_number || record.table_number || 'POS'} (Code: ${rawCode})`,
    created_at: nowIso,
  };
  recordMemoryTx(memWallet.id, tx);

  // 4. Update Supabase if available
  if (supabase) {
    try {
      await supabase
        .from('wallet_redemptions')
        .update({
          status: 'redeemed',
          redeemed_at: nowIso,
          order_id: IS_UUID(payload.order_id) ? payload.order_id : null,
        })
        .eq('code', rawCode);

      if (dbWallet?.id && IS_UUID(dbWallet.id)) {
        await supabase
          .from('guest_wallets')
          .update({ balance: after, updated_at: nowIso })
          .eq('id', dbWallet.id);

        recordMemoryTx(dbWallet.id, tx);
        await supabase.from('wallet_transactions').insert({
          wallet_id: dbWallet.id,
          guest_id: record.guest_id,
          order_id: IS_UUID(payload.order_id) ? payload.order_id : null,
          cafe_id: resolvedBiz,
          table_number: payload.table_number || record.table_number || null,
          transaction_type: 'REDEMPTION',
          rate: '100%',
          amount: deductAmount,
          balance_before: before,
          balance_after: after,
          description: tx.description,
        });
      }
    } catch (e) {
      console.warn('[Redemption DB Finalize Note]:', e);
    }
  }

  return {
    success: true,
    redeemed_amount: deductAmount,
    balance_before: before,
    balance_after: after,
    code: rawCode,
    transaction: tx,
  };
}

```

### lib/services/wallet/topup-request-approval.service.ts (79 lines)
```typescript
import type { VenueTopupRequest } from '@/types/wallet';
import { memTopupRequests } from './wallet-memory.store';
import { topUpVenueWallet } from './wallet-topup.service';
import { activateVenuePlanSubscription } from './venue-plan.service';

export async function approveTopupRequest(
  supabase: any,
  requestId: string,
  reviewedBy: string = 'admin'
) {
  let req: VenueTopupRequest | null = null;

  try {
    const { data } = await supabase
      .from('venue_topup_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();
    if (data) req = data as VenueTopupRequest;
  } catch {}

  if (!req) {
    req = memTopupRequests.find((r) => r.id === requestId) || null;
  }

  if (!req) throw new Error(`Top-up request ${requestId} not found`);
  if (req.status !== 'pending') {
    throw new Error(`Top-up request is already ${req.status}`);
  }

  const nowIso = new Date().toISOString();

  try {
    await supabase
      .from('venue_topup_requests')
      .update({
        status: 'approved',
        reviewed_by: reviewedBy,
        reviewed_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', requestId);
  } catch {}

  const memIdx = memTopupRequests.findIndex((r) => r.id === requestId);
  if (memIdx !== -1) {
    memTopupRequests[memIdx].status = 'approved';
    memTopupRequests[memIdx].reviewed_by = reviewedBy;
    memTopupRequests[memIdx].reviewed_at = nowIso;
    memTopupRequests[memIdx].updated_at = nowIso;
  }

  const isPlanSub =
    req.request_type === 'plan_subscription' ||
    (!req.request_type && req.requested_plan_tier && req.requested_plan_tier !== 'pay_as_you_go');

  let topupRes = null;
  let planUpdated = false;

  if (isPlanSub) {
    if (req.requested_plan_tier && req.requested_plan_tier !== 'pay_as_you_go') {
      await activateVenuePlanSubscription(supabase, req.venue_id, req.requested_plan_tier);
      planUpdated = true;
    }
  } else {
    topupRes = await topUpVenueWallet(supabase, req.venue_id, req.amount);
  }

  return {
    success: true,
    message: isPlanSub
      ? 'Subscription plan approved and activated successfully. Spendable wallet balance remains separate.'
      : 'Top-up approved and wallet credited successfully.',
    request: { ...req, status: 'approved', reviewed_by: reviewedBy, reviewed_at: nowIso },
    topupResult: topupRes,
    planUpdated,
  };
}

```

### lib/services/wallet/topup-request-create.service.ts (77 lines)
```typescript
import type { PlanTier, TopupRequestType, VenueTopupRequest } from '@/types/wallet';
import { memTopupRequests } from './wallet-memory.store';
import { getVenuePendingTopup } from './topup-request-queries.service';

export async function createTopupRequest(
  supabase: any,
  params: {
    venueId: string;
    amount: number;
    utrNumber: string;
    paymentMethod?: string;
    requestedPlanTier?: PlanTier | null;
    requestType?: TopupRequestType;
    notes?: string;
  }
) {
  const {
    venueId,
    amount,
    utrNumber,
    paymentMethod = 'upi_manual',
    requestedPlanTier = null,
    requestType,
    notes = '',
  } = params;

  if (amount <= 0) throw new Error('Invalid top-up amount');
  if (!utrNumber || !utrNumber.trim()) throw new Error('UTR / Transaction reference is required');

  const existingPending = await getVenuePendingTopup(supabase, venueId);
  if (existingPending) {
    throw new Error('A payment verification request is already pending review for this venue.');
  }

  const finalType: TopupRequestType =
    requestType || (requestedPlanTier && requestedPlanTier !== 'pay_as_you_go' ? 'plan_subscription' : 'wallet_topup');

  const newReq: VenueTopupRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    venue_id: venueId,
    amount,
    utr_number: utrNumber.trim(),
    payment_method: paymentMethod,
    requested_plan_tier: requestedPlanTier,
    request_type: finalType,
    status: 'pending',
    notes: notes || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('venue_topup_requests')
      .insert({
        venue_id: venueId,
        amount,
        utr_number: utrNumber.trim(),
        payment_method: paymentMethod,
        requested_plan_tier: requestedPlanTier,
        request_type: finalType,
        status: 'pending',
        notes: notes || null,
      })
      .select()
      .maybeSingle();

    if (!error && data) {
      memTopupRequests.unshift(data as VenueTopupRequest);
      return { success: true, request: data as VenueTopupRequest };
    }
  } catch {}

  memTopupRequests.unshift(newReq);
  return { success: true, request: newReq };
}

```

### lib/services/wallet/topup-request-queries.service.ts (106 lines)
```typescript
import type { VenueTopupRequest, TopupRequestStatus } from '@/types/wallet';
import { memTopupRequests } from './wallet-memory.store';

export async function getVenuePendingTopup(
  supabase: any,
  venueId: string
): Promise<VenueTopupRequest | null> {
  try {
    const { data } = await supabase
      .from('venue_topup_requests')
      .select('*')
      .eq('venue_id', venueId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      return {
        ...(data as VenueTopupRequest),
        request_type: data.request_type || (data.requested_plan_tier && data.requested_plan_tier !== 'pay_as_you_go' ? 'plan_subscription' : 'wallet_topup'),
        venue_name: (data as any).venue_name || 'Venus Cafe Oldmanali',
        venue_address: (data as any).venue_address || 'Old Manali, Himachal Pradesh',
      };
    }
  } catch {}

  const memReq = memTopupRequests.find(
    (r) => r.venue_id === venueId && r.status === 'pending'
  );
  if (memReq) {
    return {
      ...memReq,
      request_type: memReq.request_type || (memReq.requested_plan_tier && memReq.requested_plan_tier !== 'pay_as_you_go' ? 'plan_subscription' : 'wallet_topup'),
      venue_name: memReq.venue_name || 'Venus Cafe Oldmanali',
      venue_address: memReq.venue_address || 'Old Manali, Himachal Pradesh',
    };
  }
  return null;
}

export async function getAllTopupRequests(
  supabase: any,
  statusFilter?: TopupRequestStatus | 'all'
): Promise<VenueTopupRequest[]> {
  let results: VenueTopupRequest[] = [];
  try {
    let query = supabase
      .from('venue_topup_requests')
      .select('*, businesses(business_name, name)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[getAllTopupRequests] Supabase query error:', error);
      // Fallback query with simple select('*')
      const fallback = await supabase
        .from('venue_topup_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (fallback.data && fallback.data.length > 0) {
        results = fallback.data.map((item: any) => ({
          ...item,
          request_type: item.request_type || (item.requested_plan_tier && item.requested_plan_tier !== 'pay_as_you_go' ? 'plan_subscription' : 'wallet_topup'),
          venue_name: 'Venus Cafe Oldmanali',
          venue_address: 'Old Manali, Himachal Pradesh',
        }));
        if (statusFilter && statusFilter !== 'all') {
          return results.filter((r) => r.status === statusFilter);
        }
        return results;
      }
    } else if (data && data.length > 0) {
      results = data.map((item: any) => {
        const bizName = item.businesses?.business_name || item.businesses?.name || 'Venus Cafe Oldmanali';
        return {
          ...item,
          request_type: item.request_type || (item.requested_plan_tier && item.requested_plan_tier !== 'pay_as_you_go' ? 'plan_subscription' : 'wallet_topup'),
          venue_name: bizName,
          venue_address: 'Old Manali, Himachal Pradesh',
        };
      });
      return results;
    }
  } catch (err) {
    console.error('[getAllTopupRequests] Exception:', err);
  }

  const source =
    statusFilter && statusFilter !== 'all'
      ? memTopupRequests.filter((r) => r.status === statusFilter)
      : [...memTopupRequests];

  return source.map((r) => ({
    ...r,
    request_type: r.request_type || (r.requested_plan_tier && r.requested_plan_tier !== 'pay_as_you_go' ? 'plan_subscription' : 'wallet_topup'),
    venue_name: r.venue_name || 'Venus Cafe Oldmanali',
    venue_address: r.venue_address || 'Old Manali, Himachal Pradesh',
  }));
}

```

### lib/services/wallet/topup-request-rejection.service.ts (60 lines)
```typescript
import type { VenueTopupRequest } from '@/types/wallet';
import { memTopupRequests } from './wallet-memory.store';

export async function rejectTopupRequest(
  supabase: any,
  requestId: string,
  reason: string = 'Payment verification failed',
  reviewedBy: string = 'admin'
) {
  let req: VenueTopupRequest | null = null;

  try {
    const { data } = await supabase
      .from('venue_topup_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();
    if (data) req = data as VenueTopupRequest;
  } catch {}

  if (!req) {
    req = memTopupRequests.find((r) => r.id === requestId) || null;
  }

  if (!req) throw new Error(`Top-up request ${requestId} not found`);
  if (req.status !== 'pending') {
    throw new Error(`Top-up request is already ${req.status}`);
  }

  const nowIso = new Date().toISOString();

  try {
    await supabase
      .from('venue_topup_requests')
      .update({
        status: 'rejected',
        notes: reason,
        reviewed_by: reviewedBy,
        reviewed_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', requestId);
  } catch {}

  const memIdx = memTopupRequests.findIndex((r) => r.id === requestId);
  if (memIdx !== -1) {
    memTopupRequests[memIdx].status = 'rejected';
    memTopupRequests[memIdx].notes = reason;
    memTopupRequests[memIdx].reviewed_by = reviewedBy;
    memTopupRequests[memIdx].reviewed_at = nowIso;
    memTopupRequests[memIdx].updated_at = nowIso;
  }

  return {
    success: true,
    message: 'Top-up request rejected.',
    request: { ...req, status: 'rejected', notes: reason, reviewed_by: reviewedBy, reviewed_at: nowIso },
  };
}

```

### lib/services/wallet/venue-plan.service.ts (83 lines)
```typescript
import type { PlanTier } from '@/types/wallet';
import { mem } from './wallet-memory.store';
import { getVenuePendingTopup } from './topup-request-queries.service';

export async function updateVenuePlan(
  supabase: any,
  venueId: string,
  planTier: PlanTier,
  bypassPendingCheck: boolean = false
) {
  if (!bypassPendingCheck) {
    const pending = await getVenuePendingTopup(supabase, venueId);
    if (pending) {
      return {
        success: false,
        error: 'Payment verification pending. Plan shifting is locked until admin approval.',
      };
    }
  }

  const isPayGo = planTier === 'pay_as_you_go';
  const trialDays = planTier === '14k_9m' ? 270 : planTier === '12k_6m' ? 180 : 60;
  const trialEndsAt = isPayGo ? null : new Date(Date.now() + trialDays * 86400000).toISOString();
  const expiry = isPayGo ? null : new Date(Date.now() + (trialDays + 365) * 86400000).toISOString();
  const status = isPayGo ? 'active' : 'trial';

  try {
    await supabase
      .from('venue_subscriptions')
      .update({
        plan_tier: planTier,
        status,
        trial_ends_at: trialEndsAt,
        expires_at: expiry,
        updated_at: new Date().toISOString(),
      })
      .eq('venue_id', venueId);
  } catch {}

  if (mem.has(venueId)) {
    const c = mem.get(venueId)!;
    c.subscription.plan_tier = planTier;
    c.subscription.status = status;
    c.subscription.trial_ends_at = trialEndsAt;
    c.subscription.expires_at = expiry;
  }
  return { success: true, planTier };
}

export async function activateVenuePlanSubscription(
  supabase: any,
  venueId: string,
  planTier: PlanTier
) {
  const isPayGo = planTier === 'pay_as_you_go';
  const durationDays = isPayGo ? 0 : 365;
  const expiry = isPayGo ? null : new Date(Date.now() + durationDays * 86400000).toISOString();
  const status = 'active';

  try {
    await supabase
      .from('venue_subscriptions')
      .update({
        plan_tier: planTier,
        status,
        trial_ends_at: null,
        expires_at: expiry,
        updated_at: new Date().toISOString(),
      })
      .eq('venue_id', venueId);
  } catch {}

  if (mem.has(venueId)) {
    const c = mem.get(venueId)!;
    c.subscription.plan_tier = planTier;
    c.subscription.status = status;
    c.subscription.trial_ends_at = null;
    c.subscription.expires_at = expiry;
  }
  return { success: true, planTier, status, expires_at: expiry };
}


```

### lib/services/wallet/venue-wallet.service.ts (10 lines)
```typescript
export * from './wallet-memory.store';
export * from './wallet-provision.service';
export * from './topup-request-queries.service';
export * from './wallet-details.service';
export * from './wallet-topup.service';
export * from './venue-plan.service';
export * from './topup-request-create.service';
export * from './topup-request-approval.service';
export * from './topup-request-rejection.service';

```

### lib/services/wallet/wallet-details.service.ts (33 lines)
```typescript
import type { UsageLedgerItem } from '@/types/wallet';
import { mem } from './wallet-memory.store';
import { getOrProvisionVenueWallet } from './wallet-provision.service';
import { getVenuePendingTopup } from './topup-request-queries.service';

export async function getVenueWalletDetails(supabase: any, venueId: string) {
  const base = await getOrProvisionVenueWallet(supabase, venueId);
  if (!base) throw new Error('Venue not found');
  let ledger: UsageLedgerItem[] = [];

  try {
    const { data } = await supabase
      .from('usage_ledger')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) ledger = data;
  } catch {
    ledger = mem.get(venueId)?.ledger || [];
  }

  const pendingRequest = await getVenuePendingTopup(supabase, venueId);

  return {
    subscription: base.subscription,
    wallet: base.wallet,
    ledger,
    pendingRequest,
    hasPendingApproval: Boolean(pendingRequest),
  };
}

```

### lib/services/wallet/wallet-memory.store.ts (14 lines)
```typescript
import type {
  VenueSubscription,
  VenueWallet,
  UsageLedgerItem,
  VenueTopupRequest,
} from '@/types/wallet';

export const mem = new Map<
  string,
  { wallet: VenueWallet; subscription: VenueSubscription; ledger: UsageLedgerItem[] }
>();

export const memTopupRequests: VenueTopupRequest[] = [];

```

### lib/services/wallet/wallet-provision.service.ts (81 lines)
```typescript
import type { VenueSubscription, VenueWallet } from '@/types/wallet';
import { mem } from './wallet-memory.store';

export async function getOrProvisionVenueWallet(supabase: any, venueId: string) {
  if (!venueId) return null;
  let subscription: VenueSubscription | null = null;
  let wallet: VenueWallet | null = null;

  try {
    const { data: sub } = await supabase
      .from('venue_subscriptions')
      .select('*')
      .eq('venue_id', venueId)
      .maybeSingle();
    subscription = sub;

    const { data: wal } = await supabase
      .from('venue_wallets')
      .select('*')
      .eq('venue_id', venueId)
      .maybeSingle();
    wallet = wal;

    if (!subscription) {
      const { data: nSub } = await supabase
        .from('venue_subscriptions')
        .insert({
          venue_id: venueId,
          plan_tier: 'pay_as_you_go',
          status: 'active',
          trial_ends_at: null,
          expires_at: null,
        })
        .select()
        .maybeSingle();
      subscription = nSub;
    } else if (
      subscription.plan_tier === 'pay_as_you_go' &&
      (subscription.trial_ends_at || subscription.status === 'trial')
    ) {
      await supabase
        .from('venue_subscriptions')
        .update({ status: 'active', trial_ends_at: null, expires_at: null })
        .eq('id', subscription.id);
      subscription.status = 'active';
      subscription.trial_ends_at = null;
      subscription.expires_at = null;
    }

    if (!wallet) {
      const { data: nWal } = await supabase
        .from('venue_wallets')
        .insert({ venue_id: venueId, balance: 0.0, currency: 'INR' })
        .select()
        .maybeSingle();
      wallet = nWal;
    }
  } catch {}

  if (!subscription || !wallet) {
    if (!mem.has(venueId)) {
      mem.set(venueId, {
        subscription: {
          id: `sub_${venueId}`,
          venue_id: venueId,
          plan_tier: 'pay_as_you_go',
          status: 'active',
          trial_ends_at: null,
          expires_at: null,
        },
        wallet: { id: `wal_${venueId}`, venue_id: venueId, balance: 150.0, currency: 'INR' },
        ledger: [],
      });
    }
    const c = mem.get(venueId)!;
    return { subscription: c.subscription, wallet: c.wallet, cached: true };
  }

  return { subscription, wallet, cached: false };
}

```

### lib/services/wallet/wallet-topup.service.ts (82 lines)
```typescript
import { mem } from './wallet-memory.store';
import { getOrProvisionVenueWallet } from './wallet-provision.service';

export async function topUpVenueWallet(supabase: any, venueId: string, amount: number) {
  const current = await getOrProvisionVenueWallet(supabase, venueId);
  let remaining = Number(amount);
  let settledCount = 0;
  let totalOutstandingCleared = 0;

  try {
    const { data: unpaid } = await supabase
      .from('venue_outstanding_bills')
      .select('*')
      .eq('venue_id', venueId)
      .eq('status', 'unpaid')
      .order('created_at', { ascending: true });

    if (unpaid && unpaid.length > 0) {
      for (const bill of unpaid) {
        const billAmt = Number(bill.amount);
        if (remaining >= billAmt) {
          remaining -= billAmt;
          totalOutstandingCleared += billAmt;
          await supabase
            .from('venue_outstanding_bills')
            .update({ status: 'paid', updated_at: new Date().toISOString() })
            .eq('id', bill.id);
          settledCount++;
        } else {
          break;
        }
      }
    }
  } catch {}

  const currentBalance = Number(current?.wallet.balance || 0);
  const newBalance = currentBalance + remaining;

  try {
    await supabase
      .from('venue_wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('venue_id', venueId);

    await supabase.from('usage_ledger').insert({
      venue_id: venueId,
      action_type: 'CREDIT_TOPUP',
      cost: -amount,
      reference_id: `TOPUP_${Date.now()}`,
    });

    if (settledCount > 0) {
      await supabase.from('usage_ledger').insert({
        venue_id: venueId,
        action_type: 'OUTSTANDING_CLEARED',
        cost: totalOutstandingCleared,
        reference_id: `SETTLE_${Date.now()}`,
      });
    }
  } catch {}

  if (mem.has(venueId)) {
    const c = mem.get(venueId)!;
    c.wallet.balance = newBalance;
    c.ledger.unshift({
      id: `tx_${Date.now()}`,
      venue_id: venueId,
      action_type: 'CREDIT_TOPUP',
      cost: -amount,
      reference_id: `TOPUP_${Date.now()}`,
      created_at: new Date().toISOString(),
    });
  }

  return {
    success: true,
    newBalance,
    settledOutstanding: settledCount,
    outstandingCleared: totalOutstandingCleared,
  };
}

```


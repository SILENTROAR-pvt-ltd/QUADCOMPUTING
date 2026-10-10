/**
 * Catalog Item classification and recipe eligibility helpers.
 * Ensures services (e.g. Candlelight Dinner Setup, Bonfire, Bike Rental, etc.)
 * are NEVER classified as food and NEVER show recipe controls.
 */

const SERVICE_KEYWORDS = [
  'rental', 'bicycle', 'bike', 'scooter', 'activa', 'cab', 'transfer',
  'pickup', 'drop', 'shuttle', 'transport', 'transportation',
  'candlelight', 'bonfire', 'bbq', 'barbecue', 'campfire', 'spa', 'steam', 'massage',
  'trek', 'trekking', 'sightseeing', 'tour', 'guide', 'safari', 'adventure', 'camping',
  'laundry', 'pressing', 'cleaning', 'housekeeping', 'pet', 'driver',
  'check-in', 'check-out', 'pass', 'priority', 'entry', 'ticket', 'storage', 'luggage',
  'car wash', 'detailing', 'yoga', 'jacuzzi', 'pool pass', 'setup', 'decor', 'decoration',
  'experience', 'activity', 'activities', 'cot', 'crib', 'mattress', 'blanket', 'heater',
  'lunch box', 'packed lunch', 'picnic', 'dinner setup', 'candle light'
];

const SERVICE_CATEGORIES = [
  'services', 'service', 'rental', 'transportation', 'wellness', 
  'tours', 'housekeeping', 'activities', 'room add-ons', 'add-ons', 'addons'
];

export function isServiceEntity(item: any): boolean {
  if (!item) return false;

  // 1. Explicit kind or item_type signal
  if (item.kind === 'service' || item.item_type === 'service') return true;

  // 2. Explicit category signal
  const cat = String(item.category || '').toLowerCase().trim();
  if (SERVICE_CATEGORIES.some(sc => cat === sc || cat.includes(sc))) return true;

  // 3. Metadata or configuration signal
  if (
    item.metadata?.duration || 
    item.metadata?.provider_type || 
    item.metadata?.service_type || 
    item.metadata?.billingType ||
    item.billingType ||
    item.billing_type
  ) {
    return true;
  }

  // 4. Name heuristic check for known hospitality services
  const name = String(item.name || '').toLowerCase();
  return SERVICE_KEYWORDS.some(keyword => name.includes(keyword));
}

export function isRoomAddonEntity(item: any): boolean {
  if (!item) return false;

  const desc = String(item.description || item.metadata?.description || '');
  const name = String(item.name || '');
  const cat = String(item.category || '').toLowerCase().trim();
  const metaSource = String(item.metadata?.source || '').toLowerCase();
  const idStr = String(item.id || '');

  // 1. Explicit metadata linkage to room categories or room add-ons
  if (
    metaSource === 'room_category_addon' ||
    Boolean(item.metadata?.room_category_id) ||
    Boolean(item.metadata?.is_room_addon) ||
    Boolean(item.metadata?.is_addon) ||
    Boolean(item.metadata?.isAddon) ||
    Boolean(item.is_room_addon) ||
    Boolean(item.is_addon)
  ) {
    return true;
  }

  // 2. ID prefix convention from room add-on generation
  if (idStr.startsWith('addon_')) {
    return true;
  }

  // 3. Category explicitly dedicated to room add-ons
  if (cat === 'room add-ons' || cat === 'room add-on' || cat === 'add-ons' || cat === 'addons') {
    return true;
  }

  // 4. Description containing "Add-on", "Addon", or accommodation package/stay cues
  if (
    /add-?on/i.test(desc) ||
    desc.toLowerCase().includes('per stay') ||
    desc.toLowerCase().includes('per person / stay')
  ) {
    return true;
  }

  // 5. Name containing Add-on tag (e.g., "[Add-on]", "(Add-on)")
  if (/add-?on/i.test(name)) {
    return true;
  }

  // 6. Metadata billing_type specific to room stay billing
  if (
    item.metadata?.billing_type === 'per_stay' ||
    item.metadata?.billingType === 'per_stay' ||
    item.billing_type === 'per_stay' ||
    item.billingType === 'per_stay'
  ) {
    return true;
  }

  return false;
}

export function isStandaloneServiceEntity(item: any): boolean {
  if (!item) return false;
  return isServiceEntity(item) && !isRoomAddonEntity(item);
}

export function isAccommodationEntity(item: any): boolean {
  if (!item) return false;
  if (item.kind === 'accommodation' || item.item_type === 'room') return true;
  const cat = String(item.category || '').toLowerCase().trim();
  return cat === 'accommodations' || cat === 'accommodation';
}

export function isFoodBeverageEntity(item: any): boolean {
  if (!item) return false;
  // A service, accommodation, or room add-on can NEVER be restaurant food
  if (isServiceEntity(item) || isAccommodationEntity(item) || isRoomAddonEntity(item)) return false;

  if (item.kind === 'food_beverage' || item.item_type === 'food' || item.item_type === 'food_and_bev') {
    return true;
  }

  const cat = String(item.category || '').toLowerCase().trim();
  const foodCategories = [
    'food & bev', 'food', 'starters', 'main course', 'beverages', 
    'desserts', 'breads', 'breakfast', 'f&b'
  ];
  return foodCategories.includes(cat);
}

export function isRecipeEligible(item: any): boolean {
  if (!item) return false;
  // Services, Accommodations, and Room Add-ons must NEVER have recipe buttons
  if (isServiceEntity(item) || isAccommodationEntity(item) || isRoomAddonEntity(item) || item.kind === 'service') {
    return false;
  }
  return isFoodBeverageEntity(item);
}

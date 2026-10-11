// What kind of business a venue is decides which parts of the host workspace it needs:
// a café never sees Accommodations, an Airbnb or homestay host never sees Kitchen or Tables.

export const FOOD_TYPES = [
  { id: 'cafe', label: 'Café' },
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'bar', label: 'Bar & pub' },
  { id: 'bakery', label: 'Bakery & desserts' },
  { id: 'cloud_kitchen', label: 'Cloud kitchen' },
] as const;

export const STAY_TYPES = [
  { id: 'hotel', label: 'Hotel' },
  { id: 'resort', label: 'Resort' },
  { id: 'homestay', label: 'Homestay / Airbnb' },
  { id: 'hostel', label: 'Hostel / dorm' },
  { id: 'villa', label: 'Villa / estate' },
] as const;

export type BusinessModel = 'food' | 'stay' | 'both';

// Earlier versions stored these names. The old sign-up form saved "Cafe", "Restaurant", "Hotel",
// "Rooms" and "Lounge"; matching is case-insensitive, so those venues get the right sections too.
const LEGACY: Record<string, string> = { dorm: 'hostel', estate: 'villa', rooms: 'hotel', lounge: 'bar' };
const FOOD_IDS = new Set<string>(FOOD_TYPES.map((t) => t.id));
const STAY_IDS = new Set<string>(STAY_TYPES.map((t) => t.id));

/** Known venue types only, legacy names mapped, no duplicates. */
export function normalizeVenueTypes(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : [];
  const out = list
    .map((v) => String(v).trim().toLowerCase())
    .map((v) => LEGACY[v] || v)
    .filter((v) => FOOD_IDS.has(v) || STAY_IDS.has(v));
  return Array.from(new Set(out));
}

/** Food, stay or both. Older profiles only had an "offers accommodation" switch, so it still counts. */
export function businessModel(types: unknown, offersAccommodation = false): BusinessModel {
  const t = normalizeVenueTypes(types);
  const stay = offersAccommodation || t.some((v) => STAY_IDS.has(v));
  const food = t.some((v) => FOOD_IDS.has(v)) || (!stay && t.length === 0);
  return stay && food ? 'both' : stay ? 'stay' : 'food';
}

export const hasStays = (m: BusinessModel) => m !== 'food';

/** The workspace sections each kind of venue uses, in sidebar order. */
const MODULES: Record<BusinessModel, string[]> = {
  food: ['profile', 'wallet', 'dashboard', 'catalog', 'billing', 'tables', 'kitchen', 'inventory', 'expenses'],
  stay: ['profile', 'wallet', 'dashboard', 'accommodations', 'billing', 'catalog', 'expenses'],
  both: ['profile', 'wallet', 'dashboard', 'catalog', 'billing', 'tables', 'accommodations', 'kitchen', 'inventory', 'expenses'],
};

export const modulesFor = (m: BusinessModel) => MODULES[m];

/** Where a host lands when a section is not part of their venue. */
export const homeModule = (m: BusinessModel) => (m === 'stay' ? 'accommodations' : 'billing');

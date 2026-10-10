// Which kitchen station cooks a menu item. An explicit station on the catalog item wins. Otherwise the
// category and name decide. An item for a station the venue does not run goes to the Kitchen.
export const KITCHEN_STATIONS = ['Kitchen', 'Bar', 'Grill'] as const;
export type KitchenStation = (typeof KITCHEN_STATIONS)[number];

export interface StationSource {
  station?: string | null;
  category?: string | null;
  name?: string | null;
  item_type?: string | null;
}

// Whole words only: "tea" must not match "steak".
const BAR_WORDS = /\b(bar|drinks?|beverages?|beers?|cocktails?|mocktails?|coffee|tea|chai|juices?|shakes?|sodas?|wines?|lassi)\b/;
const GRILL_WORDS = /\b(grill|grilled|bbq|tandoor|steaks?|burgers?|kebabs?)\b/;

export function isKitchenStation(value: unknown): value is KitchenStation {
  return typeof value === 'string' && (KITCHEN_STATIONS as readonly string[]).includes(value);
}

/** The station from the category and name, for an item with no station set. */
export function inferStation(item: StationSource): KitchenStation {
  const text = `${item.category ?? ''} ${item.name ?? ''}`.toLowerCase();
  if (BAR_WORDS.test(text)) return 'Bar';
  if (GRILL_WORDS.test(text)) return 'Grill';
  return 'Kitchen';
}

/** The station that cooks this item at this venue: its own station if the venue runs it, else the Kitchen. */
export function resolveItemStation(item: StationSource, enabled: readonly string[]): KitchenStation {
  const wanted = isKitchenStation(item.station) ? item.station : inferStation(item);
  return wanted === 'Kitchen' || enabled.includes(wanted) ? wanted : 'Kitchen';
}

/** The stations a venue runs. Kitchen is always on; a missing or unreadable setting means all three. */
export function enabledStations(raw: unknown): KitchenStation[] {
  const list = Array.isArray(raw) ? raw.filter(isKitchenStation) : [];
  return list.length === 0 ? [...KITCHEN_STATIONS] : (['Kitchen', ...list.filter((s) => s !== 'Kitchen')] as KitchenStation[]);
}

/**
 * The guest menu's data (venue, tables, available dishes), read once and shared.
 *
 * A guest menu is public and identical for everyone at a venue, so a lunch rush of 300 phones must cost the database one
 * read, not 900. Three things make that so:
 *  - a short TTL (menu edits reach guests within FRESH_MS);
 *  - single-flight: while a read is in progress every other request waits for it instead of starting its own;
 *  - serve-stale: if the database fails, the last good copy (up to STALE_MS old) is served rather than an error.
 * The cache is per server instance, which is fine: it only bounds database reads, it is never the source of truth.
 */
import { sharedDel, sharedGet, sharedSet } from '@/lib/cache/shared-cache';

export interface VenueMenuData {
  business: any;
  tables: any[];
  items: any[];
}

export const FRESH_MS = 15_000;
export const STALE_MS = 5 * 60_000;
// A venue that does not exist is remembered in the shared cache for this long: an unknown id otherwise costs every
// instance three service-role reads per request.
export const MISS_MS = 60_000;
const MAX_VENUES = 300;

const store = new Map<string, { at: number; value: VenueMenuData }>();
const inflight = new Map<string, Promise<VenueMenuData | null>>();
const sharedKey = (businessId: string) => `menu:v1:${businessId}`;

export const clearVenueMenuCache = () => { store.clear(); inflight.clear(); };
export const invalidateVenueMenu = (businessId: string) => { store.delete(businessId); void sharedDel(sharedKey(businessId)); };

async function readFromDatabase(db: any, businessId: string): Promise<VenueMenuData | null> {
  const [biz, tables, items] = await Promise.all([
    db.from('businesses').select('*').eq('id', businessId).maybeSingle(),
    db.from('restaurant_tables').select('id, table_number, business_id, seating_capacity, status').eq('business_id', businessId),
    // Only the diet is read out of metadata (for the veg mark), not the whole column.
    db.from('catalog_items').select('id, name, description, price, category, item_type, image_url, dietary:metadata->>dietary')
      .or(`business_id.eq.${businessId},location_id.eq.${businessId}`).eq('is_available', true),
  ]);
  // A failed read is an error, not "no menu": it must never be remembered as a venue with no dishes.
  if (biz.error || tables.error || items.error) throw new Error(biz.error?.message || tables.error?.message || items.error?.message);
  if (!biz.data) return null;
  return { business: biz.data, tables: tables.data || [], items: items.data || [] };
}

/**
 * How a menu read was served: from this instance's memory, by joining a read already running here, from the cache
 * shared by all instances, or by reading the database.
 */
export type MenuSource = 'HIT' | 'SHARED' | 'REDIS' | 'MISS';

/** The venue's menu data. Returns null for a venue that does not exist; throws only when there is no copy to fall back on. */
export async function loadVenueMenu(db: any, businessId: string, now = Date.now()): Promise<VenueMenuData | null> {
  return (await loadVenueMenuWithSource(db, businessId, now)).value;
}

export async function loadVenueMenuWithSource(
  db: any, businessId: string, now = Date.now(),
): Promise<{ value: VenueMenuData | null; source: MenuSource }> {
  const hit = store.get(businessId);
  if (hit && now - hit.at < FRESH_MS) return { value: hit.value, source: 'HIT' };

  const running = inflight.get(businessId);
  if (running) return { value: await running, source: 'SHARED' };

  let source: MenuSource = 'MISS';
  const job = (async () => {
    try {
      // Another instance may have read this venue moments ago (or found that it does not exist).
      const shared = await sharedGet<VenueMenuData | null>(sharedKey(businessId));
      if (shared !== undefined) source = 'REDIS';
      const value = shared !== undefined ? shared : await readFromDatabase(db, businessId);
      if (value) {
        if (store.size >= MAX_VENUES) store.delete(store.keys().next().value as string);
        store.set(businessId, { at: now, value });
        if (shared === undefined) void sharedSet(sharedKey(businessId), value, FRESH_MS);
      } else {
        store.delete(businessId);
        if (shared === undefined) void sharedSet(sharedKey(businessId), null, MISS_MS);
      }
      return value;
    } catch (err) {
      if (hit && now - hit.at < STALE_MS) return hit.value;
      throw err;
    } finally {
      inflight.delete(businessId);
    }
  })();
  inflight.set(businessId, job);
  const value = await job;
  return { value, source };
}

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
export interface VenueMenuData {
  business: any;
  tables: any[];
  items: any[];
}

export const FRESH_MS = 15_000;
export const STALE_MS = 5 * 60_000;
const MAX_VENUES = 300;

const store = new Map<string, { at: number; value: VenueMenuData }>();
const inflight = new Map<string, Promise<VenueMenuData | null>>();

export const clearVenueMenuCache = () => { store.clear(); inflight.clear(); };
export const invalidateVenueMenu = (businessId: string) => { store.delete(businessId); };

async function readFromDatabase(db: any, businessId: string): Promise<VenueMenuData | null> {
  const [biz, tables, items] = await Promise.all([
    db.from('businesses').select('*').eq('id', businessId).maybeSingle(),
    db.from('restaurant_tables').select('id, table_number, business_id, seating_capacity, status').eq('business_id', businessId),
    db.from('catalog_items').select('id, name, description, price, category, item_type, image_url')
      .or(`business_id.eq.${businessId},location_id.eq.${businessId}`).eq('is_available', true),
  ]);
  // A failed read is an error, not "no menu": it must never be remembered as a venue with no dishes.
  if (biz.error || tables.error || items.error) throw new Error(biz.error?.message || tables.error?.message || items.error?.message);
  if (!biz.data) return null;
  return { business: biz.data, tables: tables.data || [], items: items.data || [] };
}

/** How a menu read was served: from memory, by joining a read already running, or by reading the database. */
export type MenuSource = 'HIT' | 'SHARED' | 'MISS';

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

  const job = (async () => {
    try {
      const value = await readFromDatabase(db, businessId);
      if (value) {
        if (store.size >= MAX_VENUES) store.delete(store.keys().next().value as string);
        store.set(businessId, { at: now, value });
      } else {
        store.delete(businessId);
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
  return { value: await job, source: 'MISS' };
}

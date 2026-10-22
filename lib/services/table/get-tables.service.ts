import { CLOSED_STATUSES } from '../session/session-entry.util';
import { deriveTableOccupancy } from './table-occupancy.util';

// Nothing is kept between reads: a screen reads the tables once, the moment the venue's push says something changed, and a
// cached answer from before that change (this used to keep 2.5 s) showed a new order or a settled table late, until the
// next safety read. Reads that arrive at the same moment still share one database read.
const tReads = new Map<string, Promise<any>>();

/** A write for this venue: the next read starts fresh instead of joining one that began before the write. */
export function invalidateTablesCache(businessId?: string) {
  if (businessId) {
    tReads.forEach((_, k) => {
      if (k.startsWith(businessId)) tReads.delete(k);
    });
  } else {
    tReads.clear();
  }
}

export async function getHostTables(
  requestUrl: string,
  supabase: any,
  explicitBusinessId?: string
) {
  const { searchParams } = new URL(requestUrl);
  const locationId = searchParams.get('location_id');
  const skipCache = searchParams.get('skip_cache') === 'true';
  let businessId =
    explicitBusinessId ||
    searchParams.get('business_id') ||
    searchParams.get('cafe_id') ||
    searchParams.get('venue_id');

  if (!businessId) {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      const { data: b } = await supabase
        .from('businesses')
        .select('id')
        .eq('host_id', authData.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (b) businessId = b.id;
    }
  }

  if (!businessId) {
    return { tables: [], businessId: null };
  }

  const cacheKey = `${businessId}_${locationId || ''}`;
  if (!skipCache) {
    const running = tReads.get(cacheKey);
    if (running) return running;
  }
  const read = loadTables(supabase, businessId, locationId).finally(() => {
    if (tReads.get(cacheKey) === read) tReads.delete(cacheKey);
  });
  if (!skipCache) tReads.set(cacheKey, read);
  return read;
}

async function loadTables(supabase: any, businessId: string, locationId: string | null) {
  let q = supabase
    .from('restaurant_tables')
    .select('*')
    .eq('business_id', businessId)
    .order('table_number', { ascending: true });
  if (locationId) q = q.eq('location_id', locationId);

  let [tablesRes, ordsRes] = await Promise.all([
    q,
    supabase
      .from('orders')
      .select(
        'id, table_number, table_id, grand_total, subtotal, status, items'
      )
      .eq('business_id', businessId)
      .not(
        'status',
        'in',
        `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`
      ),
  ]);

  if (tablesRes.error) throw tablesRes.error;

  let tablesData = tablesRes.data || [];

  const derivedTables = deriveTableOccupancy(tablesData, ordsRes?.data || [], supabase);
  return { tables: derivedTables, businessId };
}

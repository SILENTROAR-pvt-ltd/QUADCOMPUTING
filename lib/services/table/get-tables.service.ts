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
    const hit = tCache.get(cacheKey);
    if (hit && Date.now() < hit.exp) return hit.res;
  }

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
  const res = { tables: derivedTables, businessId };
  tCache.set(cacheKey, { res, exp: Date.now() + 2500 });
  return res;
}

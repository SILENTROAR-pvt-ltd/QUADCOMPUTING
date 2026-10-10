import { resolveBusinessId } from './resolve-business.util';
import { formatCatalogItems } from './catalog-formatter.util';

export async function fetchHostCatalog(requestUrl: string, supabase: any, explicitBusinessId?: string) {
  const resolvedBizId = explicitBusinessId || await resolveBusinessId(requestUrl, supabase);

  // NOTE: catalog_items is the single source of truth for catalog entries.
  // This used to also query a `menu_items` table that doesn't exist in this
  // schema (it always returned empty/errored and was a silent no-op).
  const [catRes, roomRes] = await Promise.all([
    supabase.from('catalog_items').select('*').eq('business_id', resolvedBizId).order('name', { ascending: true }),
    supabase.from('room_categories').select('id, name, addons, available_addons').eq('business_id', resolvedBizId),
  ]);

  const combinedCatalog: any[] = [...(catRes?.data || [])];

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


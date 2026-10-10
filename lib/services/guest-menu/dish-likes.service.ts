// Dish likes for the guest menu: how many guests like each dish, which ones this guest likes, and
// liking / un-liking a dish. Server-only (dish_likes has no client access).

const UNIQUE_VIOLATION = '23505';
// Postgres "relation does not exist", and PostgREST "table not in the schema cache".
const MISSING_TABLE = new Set(['42P01', 'PGRST205']);
const MAX_ROWS = 5000;

export interface DishLikes {
  /** False until migration 20261010000013 is applied: the menu then hides hearts instead of failing. */
  available: boolean;
  counts: Record<string, number>;
  mine: string[];
}

type Result<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

export async function loadDishLikes(db: any, businessId: string, accountId: string | null): Promise<DishLikes> {
  const { data, error } = await db
    .from('dish_likes')
    .select('catalog_item_id, account_id')
    .eq('business_id', businessId)
    .limit(MAX_ROWS);
  if (error) {
    if (MISSING_TABLE.has(error.code)) return { available: false, counts: {}, mine: [] };
    throw error;
  }
  const counts: Record<string, number> = {};
  const mine: string[] = [];
  for (const row of data || []) {
    counts[row.catalog_item_id] = (counts[row.catalog_item_id] || 0) + 1;
    if (accountId && row.account_id === accountId) mine.push(row.catalog_item_id);
  }
  return { available: true, counts, mine };
}

/** Like the dish, or take the like back. The dish must be on this venue's menu. */
export async function toggleDishLike(db: any, accountId: string, businessId: string, itemId: string): Promise<Result<{ liked: boolean; likes: number }>> {
  const { data: item, error: itemErr } = await db
    .from('catalog_items').select('id').eq('id', itemId).eq('business_id', businessId).maybeSingle();
  if (itemErr) throw itemErr;
  if (!item) return { ok: false, status: 404, error: 'That dish is not on this menu.' };

  const { data: existing, error } = await db
    .from('dish_likes').select('catalog_item_id').eq('catalog_item_id', itemId).eq('account_id', accountId).maybeSingle();
  if (error) {
    if (MISSING_TABLE.has(error.code)) return { ok: false, status: 503, error: 'Likes are not switched on for this venue yet.' };
    throw error;
  }

  if (existing) {
    const { error: delErr } = await db.from('dish_likes').delete().eq('catalog_item_id', itemId).eq('account_id', accountId);
    if (delErr) throw delErr;
  } else {
    const { error: insErr } = await db.from('dish_likes').insert({ catalog_item_id: itemId, account_id: accountId, business_id: businessId });
    // A double tap that lands twice is the same like, not an error.
    if (insErr && insErr.code !== UNIQUE_VIOLATION) throw insErr;
  }

  const { data: rows, count, error: countErr } = await db
    .from('dish_likes').select('account_id', { count: 'exact' }).eq('catalog_item_id', itemId);
  if (countErr) throw countErr;
  return { ok: true, value: { liked: !existing, likes: typeof count === 'number' ? count : (rows || []).length } };
}

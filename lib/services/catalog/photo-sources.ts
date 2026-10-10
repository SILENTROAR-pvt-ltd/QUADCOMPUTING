// Where dish photos come from: the venue's own Photo Vault, and (when configured) an external
// stock search. Both return candidates that are ranked by the same word-matching rules.
import { matchScore, rankPhotos, type PhotoCandidate, type RankedPhoto } from './image-match';
import { searchStockLibrary, type StockPhoto } from './stock-providers';
import { searchWebImages } from './web-images';

export type { StockPhoto };

/** Stock search always works: Wikimedia Commons needs no key, and Pexels or Unsplash are used when set. */
export function stockSearchConfigured(): boolean {
  return true;
}

/** Raised when the Photo Vault table is not in the database yet. Routes turn it into a clear 503. */
export class PhotoVaultNotReady extends Error {
  constructor() {
    super('The Photo Vault is not set up in your database yet. Apply migration 20261010000015_photo_vault_repair.sql in Supabase, then try again.');
    this.name = 'PhotoVaultNotReady';
  }
}

const MISSING_TABLE = new Set(['42P01', 'PGRST205']);

/** The venue's own active photos. Only the venue's own rows are ever read. */
export async function vaultPhotos(db: any, businessId: string): Promise<PhotoCandidate[]> {
  const { data, error } = await db.from('venue_photo_vault')
    .select('id, title, category, description, image_url, tags')
    .eq('venue_id', businessId).eq('is_active', true);
  if (error) {
    if (MISSING_TABLE.has(error.code)) throw new PhotoVaultNotReady();
    throw error;
  }
  return (data || [])
    .filter((r: any) => typeof r.image_url === 'string' && r.image_url.trim())
    .map((r: any) => ({
      id: String(r.id),
      source: 'vault' as const,
      url: r.image_url,
      title: r.title || '',
      // The dish names and tags a vision model read from the photo are part of its searchable text.
      text: `${r.category || ''} ${r.description || ''} ${(Array.isArray(r.tags) ? r.tags : []).join(' ')}`,
    }));
}

/** Stock photo search for one dish name. */
export async function searchStock(query: string, fetchImpl: typeof fetch = fetch): Promise<StockPhoto[]> {
  return searchStockLibrary(query, fetchImpl);
}

/**
 * Photos for a dish, for the picker. The venue's own photos that share a word with the dish come first,
 * then every stock result (the stock search already matched the name), each with its match score.
 */
export async function searchDishPhotos(db: any, businessId: string, dishName: string, withStock: boolean): Promise<RankedPhoto[]> {
  const own = rankPhotos(dishName, await vaultPhotos(db, businessId));
  if (!withStock) return own;
  // Google results are optional: if that search fails (no key, or the daily quota is used up), the other results still show.
  const web = await searchWebImages(dishName).catch(() => []);
  const webRanked = rankPhotos(dishName, web);
  const stock = await searchStock(dishName);
  const stockRanked: RankedPhoto[] = stock
    .map((p) => ({ ...p, score: matchScore(dishName, `${p.title} ${p.text}`) }))
    .sort((a, b) => b.score - a.score);
  return [...own, ...webRanked, ...stockRanked];
}

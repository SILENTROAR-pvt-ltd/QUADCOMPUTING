// The agent pass of Smart Stock Images, for dishes still without a photo: search the web and the stock
// libraries, let the photo agent pick the most authentic one, and save it. Web photos are downloaded and
// stored by us; stock photos are saved from their allowed library address.
import { searchWebImages } from './web-images';
import { searchStock } from './photo-sources';
import { ingestDishImageUrl, type UrlIngestDeps } from './url-ingest';
import { pickPhotoFor } from './web-photo-agent';
import { isStockImageUrl, type StockPhoto } from './stock-providers';
import type { DishRef } from './dish-matcher-agent';
import type { GenerateJson } from './vault-describe';

/** Dishes the agent looks at per run. Each one is a search plus a model call, so a long menu takes several runs. */
export const AGENT_DISHES_PER_RUN = 10;

export interface WebPassDeps extends Pick<UrlIngestDeps, 'fetchImpl' | 'upload' | 'resolve'> {
  generate: GenerateJson;
  /** Replaceable for tests; by default it searches Google (when configured) and the stock libraries. */
  search?: (query: string) => Promise<StockPhoto[]>;
}
export interface WebPassResult {
  matched: { id: string; name: string; image_url: string; method: 'agent' }[];
  rejected: { id: string; name: string; why: string }[];
  skipped: number;
  error?: string;
}

const defaultSearch = async (query: string): Promise<StockPhoto[]> => [
  ...await searchWebImages(query).catch(() => [] as StockPhoto[]),
  ...await searchStock(query),
];

async function saveChoice(db: any, businessId: string, dish: DishRef, photo: StockPhoto, deps: WebPassDeps): Promise<{ ok: true; image_url: string } | { ok: false; error: string }> {
  if (photo.source === 'web') {
    const res = await ingestDishImageUrl(db, businessId, dish.id, photo.sourceUrl ?? '', deps);
    return res.ok ? { ok: true, image_url: res.image_url } : { ok: false, error: res.error };
  }
  if (!isStockImageUrl(photo.url)) return { ok: false, error: 'That photo is not from an allowed library.' };
  const { error } = await db.from('catalog_items').update({ image_url: photo.url }).eq('id', dish.id).eq('business_id', businessId);
  if (error) throw error;
  return { ok: true, image_url: photo.url };
}

export async function agentWebPass(db: any, businessId: string, dishes: DishRef[], deps: WebPassDeps): Promise<WebPassResult> {
  const search = deps.search ?? defaultSearch;
  const batch = dishes.slice(0, AGENT_DISHES_PER_RUN);
  const matched: WebPassResult['matched'] = [];
  const rejected: WebPassResult['rejected'] = [];

  for (let i = 0; i < batch.length; i += 1) {
    const dish = batch[i] as DishRef;
    let candidates: StockPhoto[];
    try {
      candidates = await search(dish.name);
    } catch (e: any) {
      return { matched, rejected, skipped: dishes.length - i, error: e?.message || 'Photo search failed.' };
    }
    const pick = await pickPhotoFor(dish, candidates, deps.generate);
    if (!pick.ok) { rejected.push({ id: dish.id, name: dish.name, why: pick.why }); continue; }
    const saved = await saveChoice(db, businessId, dish, pick.photo, deps);
    if (saved.ok) matched.push({ id: dish.id, name: dish.name, image_url: saved.image_url, method: 'agent' });
    else rejected.push({ id: dish.id, name: dish.name, why: saved.error });
  }
  return { matched, rejected, skipped: Math.max(0, dishes.length - batch.length) };
}

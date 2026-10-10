// Stock pass of Smart Stock Images: a dish that has no vault photo gets the first stock photo whose title
// holds every word of its name. Looser matches are never saved; those dishes stay for the agent or the picker.
import { rankPhotos, EXACT, type PhotoCandidate } from './image-match';
import type { DishRef } from './dish-matcher-agent';

/** Same as the auto-fill batch, so every dish in a batch gets a lookup in the same run. */
export const STOCK_LOOKUPS = 100;
/** Pause between lookups: the free stock libraries rate-limit bursts (Wikimedia answers 429). */
const PAUSE_MS = 1000;

export type StockSearch = (query: string) => Promise<PhotoCandidate[]>;
export interface StockMatch { id: string; name: string; image_url: string; method: 'stock' }
export interface StockPass { matched: StockMatch[]; skipped: number; error?: string }

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function matchFromStock(dishes: DishRef[], search: StockSearch): Promise<StockPass> {
  const matched: StockMatch[] = [];
  const taken = new Set<string>();
  const batch = dishes.slice(0, STOCK_LOOKUPS);
  for (let i = 0; i < batch.length; i += 1) {
    const dish = batch[i] as DishRef;
    if (i > 0) await pause(PAUSE_MS);
    let photos: PhotoCandidate[];
    try {
      photos = await search(dish.name);
    } catch (e: any) {
      return { matched, skipped: dishes.length - i, error: e?.message || 'Stock photo search failed.' };
    }
    // Titles only: a description can mention a dish's words without the photo being that dish.
    const best = rankPhotos(dish.name, photos.filter((p) => !taken.has(p.id)).map((p) => ({ ...p, text: '' })))[0];
    if (best && best.score >= EXACT) {
      matched.push({ id: dish.id, name: dish.name, image_url: best.url, method: 'stock' });
      taken.add(best.id);
    }
  }
  return { matched, skipped: Math.max(0, dishes.length - batch.length) };
}

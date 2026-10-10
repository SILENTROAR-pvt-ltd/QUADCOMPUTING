// "Smart Stock Images", fully automatic. Pass 1: exact word match (free, no model). Pass 2, when a
// model key is set: the matching agent proposes pairs for the rest, and the verifier accepts only
// high-confidence, unique pairs. Everything else is listed for review, never guessed.
import { vaultPhotos } from './photo-sources';
import { rankPhotos, EXACT, type PhotoCandidate } from './image-match';
import { agentMatch, type DishRef, type PhotoRef } from './dish-matcher-agent';
import { matchFromStock, type StockPass, type StockSearch } from './stock-autofill';
import type { GenerateJson } from './vault-describe';

export const AUTOFILL_BATCH = 100;

export interface AutoFillResult {
  success: true;
  count: number;
  matched: { id: string; name: string; image_url: string; method: 'exact' | 'agent' | 'stock' }[];
  unmatched: { id: string; name: string }[];
  rejected: { item_id: string; photo_id: string; why: string }[];
  has_more: boolean;
  stock_error?: string;
}

const toRef = (p: PhotoCandidate): PhotoRef => ({ id: p.id, title: p.title, description: p.text, tags: [] });

export async function autoFillDishPhotos(db: any, businessId: string, generate?: GenerateJson, stock?: StockSearch): Promise<AutoFillResult> {
  const { data: items, error } = await db.from('catalog_items')
    .select('id, name, category')
    .eq('business_id', businessId)
    .or('image_url.is.null,image_url.eq.')
    .limit(AUTOFILL_BATCH);
  if (error) throw error;

  const list: DishRef[] = (items || []).map((i: any) => ({ id: i.id, name: i.name, category: i.category || '' }));
  const own = list.length ? await vaultPhotos(db, businessId) : [];
  const matched: AutoFillResult['matched'] = [];
  const taken = new Set<string>();
  const rejected: AutoFillResult['rejected'] = [];

  // Pass 1: every word of the dish name appears in the photo's text.
  const pending: DishRef[] = [];
  for (const dish of list) {
    const best = rankPhotos(dish.name, own.filter((p) => !taken.has(p.id)))[0];
    if (best && best.score >= EXACT) {
      matched.push({ id: dish.id, name: dish.name, image_url: best.url, method: 'exact' });
      taken.add(best.id);
    } else {
      pending.push(dish);
    }
  }

  // Pass 2: the agent, verified. Only photos that have not been used yet are offered.
  if (generate && pending.length > 0) {
    const free = own.filter((p) => !taken.has(p.id));
    const verdict = await agentMatch(pending, free.map(toRef), generate);
    const urlFor = new Map(free.map((p) => [p.id, p.url]));
    for (const a of verdict.accepted) {
      const dish = pending.find((d) => d.id === a.item_id);
      const url = urlFor.get(a.photo_id);
      if (dish && url) matched.push({ id: dish.id, name: dish.name, image_url: url, method: 'agent' });
    }
    rejected.push(...verdict.rejected.map((r) => ({ item_id: r.proposal.item_id, photo_id: r.proposal.photo_id, why: r.why })));
  }

  // Pass 3: stock photos, exact word matches only. Dishes still open afterwards are listed for the picker.
  let stockPass: StockPass = { matched: [], skipped: 0 };
  if (stock) {
    stockPass = await matchFromStock(list.filter((d) => !matched.some((m) => m.id === d.id)), stock);
    matched.push(...stockPass.matched);
  }

  const done = new Set(matched.map((m) => m.id));
  for (const m of matched) {
    const { error: updErr } = await db.from('catalog_items').update({ image_url: m.image_url })
      .eq('id', m.id).eq('business_id', businessId);
    if (updErr) throw updErr;
  }
  const unmatched = list.filter((d) => !done.has(d.id)).map((d) => ({ id: d.id, name: d.name }));
  const has_more = list.length === AUTOFILL_BATCH || stockPass.skipped > 0;
  return { success: true, count: matched.length, matched, unmatched, rejected, has_more, stock_error: stockPass.error };
}

// Maps words to food concepts with the lexicon, and a dish to the concepts of its own name and category. A browse
// returns the dishes that share the request's concepts. Pure and deterministic: the same words always match the same dishes.
import { normalise, tokenMatch } from './text';
import { CATEGORY_CONCEPTS, LEXICON, STOP_CONCEPTS } from './lexicon';
import type { MenuDish } from './retrieve';

const INDEX = new Map<string, Set<string>>();
for (const [concept, terms] of Object.entries(LEXICON)) {
  for (const term of terms) {
    const key = normalise(term);
    if (!key) continue;
    if (!INDEX.has(key)) INDEX.set(key, new Set());
    INDEX.get(key)!.add(concept);
  }
}
const SINGLE_WORDS = Array.from(INDEX.keys()).filter((k) => !k.includes(' ') && k.length >= 4);

/** How many distinct vocabulary entries Vibey knows (the training-set size). */
export const lexiconTermCount = (): number => INDEX.size;

/** The concepts a phrase touches. Longer phrases win first ("mac and cheese" is pasta, not a word-by-word guess). */
export function conceptsOf(text: string): Set<string> {
  const words = normalise(text).split(' ').filter(Boolean);
  const out = new Set<string>();
  for (let n = 3; n >= 1; n -= 1) {
    for (let i = 0; i + n <= words.length; i += 1) {
      const hit = INDEX.get(words.slice(i, i + n).join(' '));
      if (hit) hit.forEach((c) => out.add(c));
    }
  }
  // A typo of a known word still counts ("cappucino", "tikky"), but only when it is close enough to be sure.
  for (const w of words) {
    if (w.length < 4 || INDEX.has(w)) continue;
    let best: string | null = null;
    let score = 0;
    for (const k of SINGLE_WORDS) {
      const s = tokenMatch(w, k);
      if (s > score) { score = s; best = k; }
    }
    if (best && score >= 0.9) INDEX.get(best)!.forEach((c) => out.add(c));
  }
  return out;
}

/**
 * The concepts that describe a dish: its name and its category, without the request-only words. When the venue's
 * category names a kind of food ("Sandwiches"), that kind wins: a "Paneer Makhni Grill Sandwich" is a sandwich, not a main.
 */
export function dishConcepts(d: Pick<MenuDish, 'name' | 'category'>): Set<string> {
  const all = conceptsOf(`${d.name} ${d.category ?? ''}`);
  STOP_CONCEPTS.forEach((c) => all.delete(c));
  const fromCategory = Array.from(conceptsOf(d.category ?? '')).filter((c) => CATEGORY_CONCEPTS.has(c));
  if (fromCategory.length) {
    for (const c of Array.from(all)) if (CATEGORY_CONCEPTS.has(c) && !fromCategory.includes(c)) all.delete(c);
  }
  return all;
}

export interface BrowseMatch { dishes: MenuDish[]; concepts: string[]; coldFirst: boolean }

/**
 * The dishes a request asks for. "cold" is a preference (cold drinks first), not a filter, so "thanda" still finds the
 * drinks. Returns no dishes when no dish shares a concept with the request.
 */
export function matchBrowse(topic: string, menu: MenuDish[]): BrowseMatch {
  const wanted = conceptsOf(topic);
  STOP_CONCEPTS.forEach((c) => wanted.delete(c));
  const coldFirst = wanted.has('cold');
  wanted.delete('cold');
  // "kuch thanda" on its own asks for something cold to drink.
  if (coldFirst && !wanted.size) wanted.add('drink');
  if (!wanted.size) return { dishes: [], concepts: [], coldFirst };

  const scored = menu.map((dish) => {
    const have = dishConcepts(dish);
    const overlap = Array.from(wanted).filter((c) => have.has(c)).length;
    return { dish, overlap, cold: have.has('cold') };
  }).filter((x) => x.overlap > 0);
  if (!scored.length) return { dishes: [], concepts: Array.from(wanted), coldFirst };

  const best = Math.max(...scored.map((x) => x.overlap));
  const top = scored.filter((x) => x.overlap === best);
  // "thanda" narrows to the cold ones when there are any; otherwise every match stays.
  const cold = top.filter((x) => x.cold);
  const chosen = coldFirst && cold.length ? cold : top;
  return { dishes: chosen.map((x) => x.dish), concepts: Array.from(wanted), coldFirst };
}

/** The venue's own categories, most dishes first. Used to say what the menu does have. */
export function venueCategories(menu: MenuDish[], n = 5): string[] {
  const count = new Map<string, number>();
  for (const d of menu) {
    const c = (d.category || '').trim();
    if (c) count.set(c, (count.get(c) ?? 0) + 1);
  }
  return Array.from(count.entries()).sort((a, b) => b[1] - a[1]).slice(0, n).map(([c]) => c);
}

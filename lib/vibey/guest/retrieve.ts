// Ranks a venue's dishes against a phrase the guest said, by tokens (aliases and typos included). No model: the same
// words always give the same ranking, so the resolver's decisions can be tested and trusted.
import { bestMatch, bestTypedMatch, dishTokens, normalise } from './text';

export interface MenuDish {
  id: string;
  name: string;
  price: number;
  category?: string;
  item_type?: string;
  description?: string;
}

export interface ScoredDish {
  dish: MenuDish;
  /** 0..1: how much of the phrase and of the dish name match each other. */
  score: number;
  /** Share of the guest's words that this dish explains. */
  mentionCover: number;
  /** The phrase is this dish's name, word for word. */
  exact: boolean;
}

const tokenCache = new WeakMap<MenuDish, string[]>();
const tokensOf = (dish: MenuDish) => {
  let t = tokenCache.get(dish);
  if (!t) { t = dishTokens(dish.name); tokenCache.set(dish, t); }
  return t;
};

export function scoreDish(phrase: string, phraseTokens: string[], dish: MenuDish): ScoredDish {
  const nameTokens = tokensOf(dish);
  const exact = normalise(phrase) === normalise(dish.name)
    || (phraseTokens.length > 0 && phraseTokens.join(' ') === nameTokens.join(' '));
  if (!phraseTokens.length || !nameTokens.length) return { dish, score: exact ? 1 : 0, mentionCover: exact ? 1 : 0, exact };
  const mentionCover = phraseTokens.reduce((s, t) => s + bestMatch(t, nameTokens), 0) / phraseTokens.length;
  const dishCover = nameTokens.reduce((s, t) => s + bestTypedMatch(t, phraseTokens), 0) / nameTokens.length;
  const score = exact ? 1 : 0.6 * mentionCover + 0.4 * dishCover;
  return { dish, score, mentionCover, exact };
}

/** The dishes that match `phrase`, best first. Dishes that share no word with it are left out. */
export function rankDishes(phrase: string, menu: MenuDish[], k = 20): ScoredDish[] {
  const phraseTokens = dishTokens(phrase);
  return menu
    .map((d) => scoreDish(phrase, phraseTokens, d))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.exact) - Number(a.exact) || a.dish.name.localeCompare(b.dish.name))
    .slice(0, k);
}

/** The dishes worth showing the model for a whole message: the best few for every word group in it. */
export function candidatesFor(text: string, menu: MenuDish[], k = 20): MenuDish[] {
  const seen = new Map<string, number>();
  for (const part of normalise(text).split(/\b(?:and|aur|plus|with)\b/)) {
    for (const s of rankDishes(part, menu, 8)) seen.set(s.dish.id, Math.max(seen.get(s.dish.id) ?? 0, s.score));
  }
  for (const s of rankDishes(text, menu, k)) seen.set(s.dish.id, Math.max(seen.get(s.dish.id) ?? 0, s.score));
  const byId = new Map(menu.map((d) => [d.id, d]));
  return Array.from(seen.entries()).sort((a, b) => b[1] - a[1]).slice(0, k).map(([id]) => byId.get(id)!).filter(Boolean);
}

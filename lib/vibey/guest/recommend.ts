// Picks dishes for a guest's wishes, from this venue's menu only. Hard limits (diet, the kind of food asked for) are never
// loosened; softer wishes (light, cold, spicy, ingredients, price) are loosened one at a time when nothing fits, and the
// reply says which one gave way. Ranking: what guests here actually order, then the host's own picks, then the time of
// day, then the guest's words. One dish per family (a size choice is made later), and a spread across categories.
import { matchesDiet } from '@/lib/guest/diet-filter';
import { facetsOf, isAddOn } from './facets';
import { dishTokens } from './text';
import type { Constraints } from './constraints';
import type { MenuDish } from './retrieve';

export interface RecommendCtx {
  featured: string[];
  /** Dishes ordered at this venue recently: item id -> quantity. */
  popularity?: Record<string, number>;
  /** The venue's local hour, 0-23. */
  hour?: number;
  trayIds?: string[];
}

export interface Recommendation { dishes: MenuDish[]; relaxed: string[] }

type Rule = { name: string; soft: boolean; test: (d: MenuDish) => boolean };

function rules(c: Constraints): Rule[] {
  const out: Rule[] = [];
  if (c.diet) out.push({ name: 'diet', soft: false, test: (d) => matchesDiet({ ...d, type: d.item_type, dietary: d.dietary ?? null }, c.diet!) });
  if (c.concepts.length) out.push({ name: 'kind', soft: false, test: (d) => c.concepts.some((k) => facetsOf(d).concepts.has(k)) });
  if (c.maxPrice) out.push({ name: 'price', soft: true, test: (d) => Number(d.price) > 0 && Number(d.price) <= c.maxPrice! });
  if (c.minPrice) out.push({ name: 'price', soft: true, test: (d) => Number(d.price) >= c.minPrice! });
  if (c.ingredients.length) {
    out.push({ name: 'ingredients', soft: true, test: (d) => { const t = new Set(dishTokens(`${d.name} ${d.description ?? ''}`)); return c.ingredients.every((w) => t.has(w)); } });
  }
  if (c.spicy) out.push({ name: 'spicy', soft: true, test: (d) => facetsOf(d).spicy });
  if (c.mild) out.push({ name: 'mild', soft: true, test: (d) => !facetsOf(d).spicy });
  if (c.cold) out.push({ name: 'cold', soft: true, test: (d) => facetsOf(d).cold });
  if (c.hot) out.push({ name: 'hot', soft: true, test: (d) => facetsOf(d).hot });
  if (c.light) out.push({ name: 'light', soft: true, test: (d) => facetsOf(d).light });
  return out;
}

/** The order soft wishes give way in when nothing fits all of them: the least essential first. */
const RELAX_ORDER = ['light', 'hot', 'cold', 'mild', 'spicy', 'ingredients', 'price'];

function score(d: MenuDish, c: Constraints, ctx: RecommendCtx, maxPop: number, rank: Map<string, number>, median: number): number {
  const f = facetsOf(d);
  let s = 0;
  const pop = ctx.popularity?.[d.id] ?? 0;
  if (maxPop > 0) s += 4 * (pop / maxPop);
  const r = rank.get(d.id.toLowerCase());
  if (r !== undefined) s += 3 - Math.min(r, 5) * 0.3;
  const hour = ctx.hour ?? -1;
  if (hour >= 6 && hour < 11 && f.concepts.has('breakfast')) s += 1.5;
  if (hour >= 11 && hour < 23 && f.kind === 'main' && !f.concepts.has('breakfast')) s += 0.5;
  if ((hour >= 23 || hour < 6) && (f.kind === 'beverage' || f.light)) s += 0.5;
  // Spicy in the name (Chilly Chicken) beats a spicy chutney on the side; a soup is rarely what "spicy" means.
  if (c.spicy && f.spicy) s += /\b(chill?i|chilly|schezwan|szechuan|kolhapuri|peri peri|achari|vindaloo|kadhai|kadai)\b/i.test(d.name) ? 1.5 : 0.5;
  if (c.spicy && f.concepts.has('soup')) s -= 0.5;
  if (c.cheap || c.maxPrice) s += 1 - Math.min(Number(d.price) || 0, 1000) / 1000;
  // A ₹30 bread-and-butter is a side, not a suggestion, unless the guest asked for cheap.
  else if (Number(d.price) < 0.3 * median) s -= 1;
  return s;
}

export function recommend(menu: MenuDish[], c: Constraints, ctx: RecommendCtx, n = 6): Recommendation {
  const inTray = new Set(ctx.trayIds ?? []);
  const pool = menu.filter((d) => !inTray.has(d.id) && Number(d.price) > 0 && !isAddOn(d));
  let active = rules(c);
  const relaxed: string[] = [];
  let fits = pool.filter((d) => active.every((r) => r.test(d)));
  for (const name of RELAX_ORDER) {
    if (fits.length) break;
    if (!active.some((r) => r.soft && r.name === name)) continue;
    active = active.filter((r) => r.name !== name);
    relaxed.push(name);
    fits = pool.filter((d) => active.every((r) => r.test(d)));
  }
  const maxPop = Math.max(0, ...fits.map((d) => ctx.popularity?.[d.id] ?? 0));
  const rank = new Map(ctx.featured.map((id, i) => [id.toLowerCase(), i]));
  const order = new Map(menu.map((d, i) => [d.id, i]));
  const prices = fits.map((d) => Number(d.price)).sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)] ?? 0;
  const ranked = fits
    .map((d) => ({ d, s: score(d, c, ctx, maxPop, rank, median) }))
    .sort((a, b) => b.s - a.s || (order.get(a.d.id)! - order.get(b.d.id)!));
  // One dish per family; at most two from one category unless the guest asked for a kind.
  const families = new Set<string>();
  const perCat = new Map<string, number>();
  const picked: MenuDish[] = [];
  for (const { d } of ranked) {
    const fam = facetsOf(d).family.toLowerCase();
    const cat = (d.category || '').toLowerCase();
    if (families.has(fam)) continue;
    if (!c.concepts.length && (perCat.get(cat) ?? 0) >= 2) continue;
    families.add(fam);
    perCat.set(cat, (perCat.get(cat) ?? 0) + 1);
    picked.push(d);
    if (picked.length >= n) break;
  }
  return { dishes: picked, relaxed };
}

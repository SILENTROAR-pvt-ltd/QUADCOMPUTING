// A spread for a table ("dinner for 4", "hum 3 log hain"): a starter, mains, something to eat them with, a drink each and
// a sweet to share, from what guests here order most and the host's own picks. Quantities follow the table size; a
// number the guest gave is read as the budget for the whole table and the spread is trimmed to fit it.
import { rupees } from '@/lib/guest/cashback';
import { facetsOf, familyOf, isAddOn } from './facets';
import { isStarter, pairWith } from './pairing';
import { recommend, type RecommendCtx } from './recommend';
import type { Constraints } from './constraints';
import type { MenuDish } from './retrieve';

export interface PlanLine { dish: MenuDish; qty: number; role: 'starter' | 'main' | 'side' | 'drink' | 'dessert' }

const INDIAN_BREAD = /\b(roti|naan|nan|kulcha|paratha|parantha|chapati|phulka)\b/i;
export const planTotal = (lines: PlanLine[]) => lines.reduce((s, l) => s + (Number(l.dish.price) || 0) * l.qty, 0);

/** `style` is the kind of main the table is craving (one of the menu's categories), or null to let Vibey choose. */
export function planFor(people: number, c: Constraints, menu: MenuDish[], ctx: RecommendCtx, style: string | null = null): PlanLine[] {
  const food = menu.filter((d) => !isAddOn(d));
  const first = build(people, c, food, ctx, Boolean(c.cheap), style);
  // Over the table's budget even after the extras gave way: the same spread drawn from the lighter-priced dishes.
  return c.maxPrice && planTotal(first) > c.maxPrice && !c.cheap ? build(people, c, food, ctx, true, style) : first;
}

function build(people: number, c: Constraints, menu: MenuDish[], ctx: RecommendCtx, cheap: boolean, style: string | null): PlanLine[] {
  const n = Math.max(1, Math.min(people, 12));
  const wish: Constraints = { ...c, concepts: [], ingredients: [], maxPrice: undefined, minPrice: undefined, cheap };
  // "Non-veg" is about the starter and the mains; the drinks, the sweet and the bread are whatever goes best.
  const meat = c.diet === 'non_veg' || c.diet === 'egg';
  const free: Constraints = meat ? { ...wish, diet: undefined } : wish;
  const hour = ctx.hour ?? 20;
  // A cold drink with lunch or dinner, tea or coffee in the morning, unless the guest asked for something hot.
  const drinkWish: Constraints = { ...free, cold: !c.hot && hour >= 11 && hour < 23 ? true : free.cold };
  const lines: PlanLine[] = [];
  const taken = () => [...(ctx.trayIds ?? []), ...lines.flatMap((l) => familyOf(l.dish, menu).map((d) => d.id))];
  const pick = (pool: MenuDish[], k: number, w = wish) => recommend(pool, w, { ...ctx, trayIds: taken() }, k).dishes;
  // A main that comes in sizes is the Full one for a table, the Half one for one guest.
  const sized = (d: MenuDish) => {
    const fam = familyOf(d, menu);
    return fam.find((x) => facetsOf(x).variant === (n >= 2 ? 'Full' : 'Half')) ?? d;
  };
  const starters = menu.filter(isStarter);
  const firstCourse = pick(starters, n >= 4 ? 2 : 1);
  for (const d of firstCourse.length || !meat ? firstCourse : pick(starters, 1, free)) lines.push({ dish: d, qty: n >= 6 ? 2 : 1, role: 'starter' });
  const mains = menu.filter((d) => facetsOf(d).kind === 'main' && !isStarter(d) && !facetsOf(d).concepts.has('breakfast'));
  const craved = style ? mains.filter((d) => (d.category ?? '').trim().toLowerCase() === style.toLowerCase()) : [];
  const count = n <= 2 ? 1 : n <= 5 ? 2 : 3;
  // The craving first; a second or third main from elsewhere when that kind has too few for the table.
  const chosen = pick(craved.length ? craved : mains, count);
  if (craved.length && chosen.length < count) {
    chosen.push(...pick(mains.filter((d) => !chosen.some((x) => facetsOf(x).family === facetsOf(d).family)), count - chosen.length));
  }
  for (const d of chosen) lines.push({ dish: sized(d), qty: 1, role: 'main' });
  const anchors = lines.filter((l) => l.role === 'main').map((l) => l.dish);
  // Something to eat the mains with (a bread, rice, fries); the drink and the sweet have their own places below.
  const side = pairWith(anchors, menu, { ...ctx, trayIds: taken() }, 3).find((d) => !['beverage', 'dessert'].includes(facetsOf(d).kind));
  if (side) lines.push({ dish: side, qty: INDIAN_BREAD.test(side.name) ? Math.min(n * 2, 20) : Math.ceil(n / 2), role: 'side' });
  const drink = pick(menu.filter((d) => facetsOf(d).kind === 'beverage'), 1, drinkWish)[0];
  if (drink) lines.push({ dish: drink, qty: n, role: 'drink' });
  const sweet = n >= 2 ? pick(menu.filter((d) => facetsOf(d).kind === 'dessert'), 1, free)[0] : undefined;
  if (sweet) lines.push({ dish: sweet, qty: Math.ceil(n / 2), role: 'dessert' });
  // A budget for the whole table: the extras give way first (the sweet, the drinks, a second starter, a second main).
  if (c.maxPrice) {
    for (const role of ['dessert', 'drink', 'starter', 'main'] as const) {
      while (planTotal(lines) > c.maxPrice && lines.filter((l) => l.role === role).length > (role === 'main' ? 1 : 0)) {
        lines.splice(lines.map((l) => l.role).lastIndexOf(role), 1);
      }
    }
  }
  return lines;
}

/** One dish per line ("• 2 × Paneer Pakora · ₹480"), which the chat draws as a row: quantity, name, price. */
export function planText(people: number, lines: PlanLine[], budget?: number): string {
  if (!lines.length) return 'I couldn’t put a spread together from this menu just now. Shall I show you what’s popular instead?';
  const who = people === 1 ? 'you' : `${people}`;
  const total = planTotal(lines);
  const over = budget && total > budget ? `\nThat’s a little over your ${rupees(budget)}, the closest I could get.` : '';
  const rows = lines.map((l) => `• ${l.qty} × ${l.dish.name} · ${rupees((Number(l.dish.price) || 0) * l.qty)}`).join('\n');
  return `Here’s a spread for ${who}, about ${rupees(total)} in all:\n${rows}${over}\nTap “Add the whole spread”, or change any dish below.`;
}

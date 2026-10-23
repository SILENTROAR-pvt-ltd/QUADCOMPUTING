// The guest's diet filter on the menu: Veg, Vegan, Egg, Non-veg. A dish's diet is its menu mark (see dish-mark), and a
// dish the host saved as vegan is also vegetarian, so it shows under Veg as well as Vegan. A dish with no mark (its diet
// is not known) shows only when no filter is chosen.
import { dishMark } from './dish-mark';

export type DietChoice = 'veg' | 'vegan' | 'egg' | 'non_veg';
export type DietFilter = 'all' | DietChoice;

interface Dish { name: string; description?: string | null; category?: string | null; type?: string | null; dietary?: string | null }

export const DIET_LABEL: Record<DietChoice, string> = { veg: 'Veg', vegan: 'Vegan', egg: 'Egg', non_veg: 'Non-veg' };
const ORDER: DietChoice[] = ['veg', 'vegan', 'egg', 'non_veg'];

export function dishDiet(d: Dish): DietChoice | null {
  const mark = dishMark(d);
  return mark === 'veg' && d.dietary === 'vegan' ? 'vegan' : mark;
}

export function matchesDiet(d: Dish, filter: DietFilter): boolean {
  if (filter === 'all') return true;
  const diet = dishDiet(d);
  return filter === 'veg' ? diet === 'veg' || diet === 'vegan' : diet === filter;
}

/**
 * The choices worth offering, with how many dishes each shows: only a choice that narrows the menu (some dishes, not all
 * of them). A pure-veg menu offers no Veg chip, and one with no vegan dish offers no Vegan chip.
 */
export function dietChoices(items: Dish[]): { diet: DietChoice; count: number }[] {
  return ORDER
    .map((diet) => ({ diet, count: items.filter((d) => matchesDiet(d, diet)).length }))
    .filter(({ count }) => count > 0 && count < items.length);
}

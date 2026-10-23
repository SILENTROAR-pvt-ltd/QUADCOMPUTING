// What Vibey knows about one dish beyond its name, all read from the venue's own menu: the diet the venue saved (or the
// menu's words when it saved none), whether it is spicy, light, cold or hot, what kind of dish it is, and which family
// it belongs to ("Butter Chicken (Half)" and "(Full)" are one family in two sizes). Computed once per dish object.
import { dishDiet, type DietChoice } from '@/lib/guest/diet-filter';
import { kindOf, type DishKind } from '@/lib/guest/cart-suggestions';
import { dishConcepts } from './concepts';
import { normalise } from './text';
import type { MenuDish } from './retrieve';

export interface DishFacets {
  diet: DietChoice | null;
  spicy: boolean;
  light: boolean;
  cold: boolean;
  hot: boolean;
  kind: DishKind;
  concepts: Set<string>;
  /** The dish without its size or style: "Butter Chicken" for "Butter Chicken (Half)". */
  family: string;
  /** "Half", "Full", "Steamed", "Dry"… when the name ends with one in brackets. */
  variant: string | null;
}

const SPICY = /\b(chill?i|chilly|mirchi|schezwan|szechuan|kolhapuri|peri peri|vindaloo|jalapeno|spicy|fiery|achari|chettinad|kadhai|kadai|hot n sour|hot and sour|hot 'n' sour)\b/i;
const LIGHT = /\b(salad|soup|toast|fruit|curd|raita|muesli|porridge|cornflakes|juice|poached|steamed|clear|green tea|sprouts?|idli|omelette)\b/i;
const HOT_DRINK = /\b(tea|chai|coffee|hot chocolate|espresso|cappuccino|latte|soup)\b/i;
const COLD_WORD = /\b(cold|iced|shake|juice|lassi|smoothie|soda|mojito|cooler|frappe|ice cream)\b/i;
export const VARIANTS = ['half', 'full', 'steamed', 'fried', 'kurkure', 'dry', 'gravy', 'small', 'medium', 'large', 'regular'];
const VARIANT = new RegExp(`^(.*?)\\s*\\((${VARIANTS.join('|')})\\)\\s*$`, 'i');

const cache = new WeakMap<MenuDish, DishFacets>();

export function facetsOf(d: MenuDish): DishFacets {
  const hit = cache.get(d);
  if (hit) return hit;
  const text = `${d.name} ${d.description ?? ''}`;
  const kind = kindOf({ category: d.category, item_type: d.item_type, name: d.name });
  const concepts = dishConcepts(d);
  const v = VARIANT.exec(d.name);
  const cold = concepts.has('cold') || (kind !== 'main' && COLD_WORD.test(text)) || /\b(cold beverages?|juices?)\b/i.test(d.category ?? '');
  const facets: DishFacets = {
    diet: dishDiet({ name: d.name, description: d.description, category: d.category, type: d.item_type, dietary: d.dietary ?? null }),
    spicy: SPICY.test(text),
    light: LIGHT.test(text) || /\b(salad|soups?|curd|juices?)\b/i.test(d.category ?? ''),
    cold,
    hot: !cold && (HOT_DRINK.test(text) || /\bsoups?\b/i.test(d.category ?? '')),
    kind,
    concepts,
    family: v ? v[1].trim() : d.name,
    variant: v ? v[2][0].toUpperCase() + v[2].slice(1).toLowerCase() : null,
  };
  cache.set(d, facets);
  return facets;
}

/** An extra for another dish ("Extra Cheese", "Add-on Pav", a "Toppings" category): never suggested as a dish of its own. */
export const isAddOn = (d: MenuDish) => /^(extra|add[ -]?on|additional)\b/i.test(d.name.trim()) || /\b(add[ -]?ons?|extras?|toppings?)\b/i.test(d.category ?? '');

/** The dishes of one family ("Chicken Momos" in Steamed, Fried and Kurkure), in menu order. */
export function familyOf(d: MenuDish, menu: MenuDish[]): MenuDish[] {
  const fam = normalise(facetsOf(d).family);
  return menu.filter((x) => normalise(facetsOf(x).family) === fam);
}

/** The variant word a guest used ("half", "kurkure"), if any. */
export function variantWord(text: string): string | null {
  const words = normalise(text).split(' ');
  const hit = VARIANTS.find((v) => words.includes(v));
  return hit ? hit[0].toUpperCase() + hit.slice(1) : null;
}

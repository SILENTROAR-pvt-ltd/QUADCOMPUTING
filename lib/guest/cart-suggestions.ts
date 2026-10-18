// What to suggest to a guest who is reviewing their order: a drink if the order has none, something sweet to end on, and
// dishes that go with what they chose. Pure, so the rules are tested.

export interface SuggestableDish {
  id: string;
  name: string;
  price: number;
  category: string;
  type?: string;
  item_type?: string;
  image_url?: string;
  available?: boolean;
  item_options?: unknown[];
  options?: unknown[];
  customization_groups?: unknown[];
}

export type DishKind = 'beverage' | 'dessert' | 'side' | 'main';
export interface Suggestion { id: 'drinks' | 'sweet' | 'pairs'; title: string; items: SuggestableDish[] }

const BEVERAGE = /beverage|drink|shake|juice|tea\b|chai|coffee|mocktail|cocktail|lassi|soda|smoothie|lemonade|beer|wine|spirit|mojito/i;
const DESSERT = /dessert|sweet|ice.?cream|cake|brownie|pastry|halwa|gulab|kulfi|jalebi|waffle|sundae|mousse|pudding|donut|doughnut|tiramisu|kheer|rasmalai/i;
const SIDE = /side|starter|snack|quick bites|fries|bread|raita|salad|soup/i;

/** What kind of dish this is, from its category first and its type or name when the category says nothing. */
export function kindOf(d: { category?: string; type?: string; item_type?: string; name?: string }): DishKind {
  const category = d.category || '';
  if (BEVERAGE.test(category)) return 'beverage';
  if (DESSERT.test(category)) return 'dessert';
  if (SIDE.test(category)) return 'side';
  const type = `${d.type || ''} ${d.item_type || ''}`;
  if (/drink|beverage/i.test(type)) return 'beverage';
  if (!category && BEVERAGE.test(d.name || '')) return 'beverage';
  return 'main';
}

const hasOptions = (d: SuggestableDish) =>
  Boolean((d.item_options?.length ?? 0) || (d.options?.length ?? 0) || (d.customization_groups?.length ?? 0));

/** A dish a guest can add in one tap: on the menu, priced, not already ordered, and with no choices to make first. */
const addable = (d: SuggestableDish, inCart: Set<string>) =>
  d.available !== false && Number(d.price) > 0 && !inCart.has(d.id) && !hasOptions(d)
  && !['accommodation', 'service', 'room'].includes(String(d.type || d.item_type || '').toLowerCase());

export function suggestForCart(
  cart: Array<{ item_id: string; category?: string; name?: string }>,
  menu: SuggestableDish[],
  featured: string[] = [],
  perSection = 6,
): Suggestion[] {
  if (cart.length === 0) return [];
  const inCart = new Set(cart.map((c) => c.item_id));
  const kinds = new Set(cart.map((c) => kindOf({ category: c.category, name: c.name })));
  const rank = new Map(featured.map((id, i) => [id.toLowerCase(), i]));
  // The venue's own top picks come first, then the menu in its own order.
  const ordered = menu
    .map((d, i) => ({ d, i }))
    .sort((a, b) => (rank.get(a.d.id.toLowerCase()) ?? 99) - (rank.get(b.d.id.toLowerCase()) ?? 99) || a.i - b.i)
    .map((x) => x.d);
  const pool = ordered.filter((d) => addable(d, inCart));
  const used = new Set<string>();
  const take = (kind: DishKind[], n: number) => {
    const picked = pool.filter((d) => kind.includes(kindOf(d)) && !used.has(d.id)).slice(0, n);
    picked.forEach((d) => used.add(d.id));
    return picked;
  };

  const out: Suggestion[] = [];
  const eating = kinds.has('main') || kinds.has('side') || kinds.has('dessert');
  if (eating && !kinds.has('beverage')) {
    const items = take(['beverage'], perSection);
    if (items.length) out.push({ id: 'drinks', title: 'Add a drink', items });
  }
  if ((kinds.has('main') || kinds.has('side')) && !kinds.has('dessert')) {
    const items = take(['dessert'], Math.min(4, perSection));
    if (items.length) out.push({ id: 'sweet', title: 'Something sweet to end on', items });
  }
  if (kinds.has('main') && !kinds.has('side')) {
    const items = take(['side'], perSection);
    if (items.length) out.push({ id: 'pairs', title: 'Goes well with your order', items });
  } else if (!eating) {
    // Only drinks so far: suggest something to eat with them.
    const items = take(['side', 'main'], perSection);
    if (items.length) out.push({ id: 'pairs', title: 'Something to go with it', items });
  }
  return out;
}

// What goes with a dish, from this venue's menu: a curry wants a bread, rice or raita; Chinese wants fried rice, noodles or
// a soup; a soup wants a starter or garlic bread (never a roti); a starter wants a drink and a main to follow; pizza,
// pasta and burgers want a cold drink or fries; breakfast wants tea, coffee or juice; a dessert wants a coffee; a drink
// alone wants a snack. Each group offers its best dish (most ordered, then the host's picks).
import { facetsOf, isAddOn } from './facets';
import type { MenuDish } from './retrieve';

type Want = { label: string; test: (d: MenuDish) => boolean };

const cat = (d: MenuDish) => `${d.category ?? ''}`.toLowerCase();
const has = (d: MenuDish, ...concepts: string[]) => concepts.some((c) => facetsOf(d).concepts.has(c));
const INDIAN_BREAD = /\b(roti|naan|nan|kulcha|paratha|parantha|chapati|chapatti|phulka|puri|poori|bhatura|lachha|rumali|missi)\b/i;
const GRAVY = /\b(masala|curry|makhani|butter chicken|gravy|lababdar|korma|handi|do pyaza|kofta|kadhai|kadai|shahi|palak|saag|matar|chole|rajma|keema|rogan|vindaloo|chettinad|kolhapuri|bhuna)\b/i;
const BREAD: Want = { label: 'bread', test: (d) => has(d, 'bread') || /\bbreads?\b/.test(cat(d)) };
const RICE: Want = { label: 'rice', test: (d) => /\brice\b/.test(cat(d)) || (has(d, 'rice') && !/\bbiryani\b/i.test(d.name)) };
const RAITA: Want = { label: 'raita', test: (d) => /\braita\b/i.test(d.name) || (/^(curd|raita|dahi)$/i.test(cat(d).trim()) && !has(d, 'breakfast')) };
const COLD_DRINK: Want = { label: 'drink', test: (d) => facetsOf(d).kind === 'beverage' && facetsOf(d).cold };
const HOT_DRINK: Want = { label: 'hot drink', test: (d) => facetsOf(d).kind === 'beverage' && facetsOf(d).hot };
const SOUP: Want = { label: 'soup', test: (d) => has(d, 'soup') || /\bsoups?\b/.test(cat(d)) };
const SALAD: Want = { label: 'salad', test: (d) => /\bsalads?\b/i.test(`${d.name} ${cat(d)}`) };
const CHINESE_MAIN: Want = { label: 'noodles or fried rice', test: (d) => /\b(fried rice|noodles?|hakka|chow ?mein)\b/i.test(d.name) && !SOUP.test(d) };
const CHINESE_STARTER: Want = { label: 'Chinese starter', test: (d) => /\b(momos?|spring rolls?|manchurian|chill?i|chilly|dim ?sums?|wontons?|honey)\b/i.test(d.name) && !SOUP.test(d) && !CHINESE_MAIN.test(d) && !['beverage', 'dessert'].includes(facetsOf(d).kind) };
const SOUP_SIDE: Want = { label: 'garlic bread', test: (d) => /\b(garlic bread|bruschetta|bread ?sticks?|cheese toast|garlic toast|croutons?)\b/i.test(d.name) };
const FRIES: Want = { label: 'fries', test: (d) => /\bfries\b/i.test(d.name) };
const DESSERT: Want = { label: 'dessert', test: (d) => facetsOf(d).kind === 'dessert' };
// A dry starter (tikka, kebab, wings) whatever its category says; "Chicken Tikka Masala" is a curry, not a starter.
const STARTER_WORD = /\b(tikka|kebabs?|kababs?|seekh|tangdi|wings|lollipop|pakoras?|pakodas?|cutlets?|fingers|nuggets|popcorn|nachos|wedges|chaat|papad|platter)\b/i;
const STARTER: Want = { label: 'starter', test: (d) => (facetsOf(d).kind === 'side' || STARTER_WORD.test(d.name)) && !GRAVY.test(d.name) && !INDIAN_BREAD.test(d.name) && !SOUP.test(d) && !BREAD.test(d) && !RAITA.test(d) && !SALAD.test(d) };
const CURRY: Want = { label: 'curry', test: (d) => facetsOf(d).kind === 'main' && (GRAVY.test(d.name) || /\b(dal|curry|main course)\b/i.test(`${cat(d)} ${d.name}`)) };
const BIRYANI: Want = { label: 'biryani', test: (d) => /\b(biryani|pulao)\b/i.test(d.name) };
/** A dry starter or snack: not a soup, bread, raita, salad or a curry. */
export const isStarter = (d: MenuDish) => STARTER.test(d);
const CHINESE_SOUP = /\b(manchow|hot n sour|hot and sour|hot 'n' sour|sweet corn|wonton|lemon coriander|talumein|thukpa|tom yum|noodle soup)\b/i;

function wantsFor(anchor: MenuDish): Want[] {
  const f = facetsOf(anchor);
  const text = `${anchor.name} ${cat(anchor)}`;
  if (f.kind === 'beverage') return [STARTER, DESSERT];
  if (f.kind === 'dessert') return [HOT_DRINK, COLD_DRINK];
  if (SOUP.test(anchor)) return CHINESE_SOUP.test(text) || has(anchor, 'chinese') ? [CHINESE_STARTER, CHINESE_MAIN] : [SOUP_SIDE, STARTER, SALAD];
  if (SALAD.test(anchor)) return [SOUP, COLD_DRINK];
  if (has(anchor, 'breakfast') || /\b(breakfast|toast|omelette|maggi)\b/i.test(text)) return [HOT_DRINK, COLD_DRINK];
  if (has(anchor, 'chinese', 'noodles') || /\b(momos?|thukpa|chopsuey|manchurian|schezwan)\b/i.test(text)) return [SOUP, CHINESE_MAIN, COLD_DRINK];
  if (has(anchor, 'pizza', 'pasta', 'burger', 'sandwich', 'roll') || /\b(lasagne|enchilada|sizzler|steak|falafel|lafa|schnitzel)\b/i.test(text)) return [COLD_DRINK, FRIES, DESSERT];
  if (/\b(biryani|pulao|fried rice)\b/i.test(anchor.name)) return [RAITA, COLD_DRINK];
  if (RAITA.test(anchor)) return [BIRYANI, RICE];
  if (has(anchor, 'bread') || BREAD.test(anchor)) return INDIAN_BREAD.test(anchor.name) ? [CURRY] : [SOUP, COLD_DRINK];
  if (FRIES.test(anchor)) return [COLD_DRINK, DESSERT];
  if ((f.kind === 'side' || STARTER_WORD.test(anchor.name)) && !GRAVY.test(anchor.name)) return [COLD_DRINK, CURRY];
  return [BREAD, RICE, RAITA, COLD_DRINK];
}

/**
 * Up to `n` dishes that go with the anchors: never one already in the tray or another size of an anchor, nothing of a
 * kind the tray already has (no second bread when naan is there), and only veg dishes alongside veg ones.
 */
export function pairWith(anchors: MenuDish[], menu: MenuDish[], ctx: { featured: string[]; popularity?: Record<string, number>; trayIds?: string[] }, n = 4): MenuDish[] {
  if (!anchors.length) return [];
  const skip = new Set([...(ctx.trayIds ?? []), ...anchors.map((a) => a.id)]);
  const taken = menu.filter((d) => skip.has(d.id));
  const families = new Set(anchors.map((a) => facetsOf(a).family.toLowerCase()));
  // Veg dishes are paired with veg dishes (the suggestion follows what was just chosen, not the rest of the table).
  const vegOnly = anchors.every((d) => facetsOf(d).diet === 'veg' || facetsOf(d).diet === 'vegan');
  const rank = new Map(ctx.featured.map((id, i) => [id.toLowerCase(), i]));
  const order = new Map(menu.map((d, i) => [d.id, i]));
  const best = (want: Want) => (taken.some((d) => want.test(d)) ? undefined : menu
    .filter((d) => !skip.has(d.id) && !families.has(facetsOf(d).family.toLowerCase()) && Number(d.price) > 0 && !isAddOn(d) && want.test(d)
      && (!vegOnly || facetsOf(d).diet === 'veg' || facetsOf(d).diet === 'vegan'))
    .sort((a, b) => (ctx.popularity?.[b.id] ?? 0) - (ctx.popularity?.[a.id] ?? 0)
      || (rank.get(a.id.toLowerCase()) ?? 99) - (rank.get(b.id.toLowerCase()) ?? 99) || order.get(a.id)! - order.get(b.id)!)[0]);
  const picks: MenuDish[] = [];
  for (const anchor of anchors.slice(-2)) {
    for (const want of wantsFor(anchor)) {
      const d = best(want);
      if (d && !picks.includes(d)) { picks.push(d); skip.add(d.id); families.add(facetsOf(d).family.toLowerCase()); }
      if (picks.length >= n) return picks;
    }
  }
  return picks;
}

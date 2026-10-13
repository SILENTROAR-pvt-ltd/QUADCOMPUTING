// Which food sticker sits on each menu category chip. Hosts name their categories freely ("Dals & Lentils",
// "Hot Beverages", "Quick Bites"), so the name is matched against keywords, most specific first; anything
// unrecognised gets a plate. The stickers are Microsoft's Fluent 3D emoji (MIT), resized and served from
// public/menu-stickers by scripts/build-menu-stickers.mjs, so they cost one tiny local file each.

/** The "all dishes" chip, and any category with no closer match. */
export const ALL_DISHES_STICKER = '1f37d-fe0f';

const RULES: Array<[RegExp, string]> = [
  [/pizza/, '1f355'],
  [/burger/, '1f354'],
  [/sandwich|panini|\bsubs?\b|toast/, '1f96a'],
  [/pav ?bhaji|bhaji/, '1f958'],
  [/\brolls?\b|wrap|kathi|frank(ie|y)|shawarma|burrito/, '1f32f'],
  [/noodle|chow ?mein|hakka|ramen|maggi/, '1f35c'],
  [/momo|dim ?sum|dumpling|chinese|manchurian|oriental/, '1f95f'],
  [/biryani|pulao|\brice\b/, '1f35b'],
  [/\bdals?\b|lentil/, '1f372'],
  [/soup|shorba/, '1f963'],
  [/salad/, '1f957'],
  [/roti|naan|paratha|kulcha|bhatura|dosa|idli|uttapam|south ?indian/, '1fad3'],
  [/bread|\bbuns?\b|loaf/, '1f35e'],
  [/pasta|spaghetti|penne|macaroni/, '1f35d'],
  [/taco|mexican|nacho|quesadilla/, '1f32e'],
  [/hot ?dog/, '1f32d'],
  [/kebab|kabab|tikka|tandoor|grill|bbq|barbecue|skewer/, '1f362'],
  [/chicken|non[- ]?veg|wings/, '1f357'],
  [/mutton|lamb|\bmeats?\b|steak/, '1f356'],
  [/fish|sea ?food|prawn|shrimp|crab/, '1f364'],
  [/\beggs?\b|omelette|breakfast|brunch/, '1f373'],
  [/thali|combo|\bmeals?\b|platter/, '1f371'],
  [/fries|starter|appeti[sz]er|snack|quick ?bite|chaat|finger ?food|small ?plate/, '1f35f'],
  [/curry|main|gravy|paneer|north ?indian|sabzi|indian/, '1f35b'],
  [/ice ?cream|sundae|gelato|kulfi|frozen/, '1f368'],
  [/cake|pastr|brownie|bakery|baked/, '1f370'],
  [/cookie|biscuit/, '1f36a'],
  [/donut|doughnut/, '1f369'],
  [/croissant|puff/, '1f950'],
  [/chocolate/, '1f36b'],
  [/dessert|sweet|mithai|pudding/, '1f36e'],
  [/popcorn/, '1f37f'],
  [/boba|bubble ?tea/, '1f9cb'],
  [/shake|smoothie|frapp/, '1f964'],
  [/\btea\b|chai/, '1f375'],
  [/coffee|espresso|latte|cappuccino|hot (bev|drink)/, '2615'],
  [/juice|mocktail|cooler|lemonade|\bsoda\b|soft ?drink/, '1f379'],
  [/cocktail|\bbar\b|spirit|liquor/, '1f378'],
  [/beer|brew/, '1f37a'],
  [/\bwines?\b/, '1f377'],
  [/bev|drink|thirst/, '1f964'],
  [/\bsides?\b|add[- ]?ons?|extras?|accompan|\bdips?\b|raita/, '1f963'],
  [/kids/, '1f9c1'],
];

/** Every sticker the menu can show: the files public/menu-stickers must hold. */
export const STICKER_CODES: readonly string[] = Array.from(new Set([ALL_DISHES_STICKER, ...RULES.map(([, code]) => code)]));

/** The sticker code for a category name ("Dining", the all-dishes filter, gets the plate). */
export function stickerFor(category: string): string {
  const name = category.trim().toLowerCase();
  if (!name || name === 'dining') return ALL_DISHES_STICKER;
  return RULES.find(([pattern]) => pattern.test(name))?.[1] ?? ALL_DISHES_STICKER;
}

/** Where a sticker is served from. */
export const stickerSrc = (code: string) => `/menu-stickers/${code}.webp`;

// Vibey's answers to questions: what is popular, what something costs, what a dish is, which dishes of a kind or diet
// exist. Every name, price, description and diet fact comes from the venue's menu; the wording is a template.
import { rupees } from '@/lib/guest/cashback';
import { resolveMention, FLOOR } from './resolve';
import { rankDishes, type MenuDish } from './retrieve';
import { dishTokens } from './text';
import { dietOf, dietRequest, dishesForDiet, isDietWord } from './diet';
import { CONCEPT_LABEL } from './lexicon';
import { matchBrowse, venueCategories } from './concepts';
import { facetsOf } from './facets';

export interface Answer { text: string; cards: string[]; chips?: string[]; staff?: 'dietary' | 'other' }

const ids = (ds: MenuDish[]) => ds.map((d) => d.id);

/** The host's own top picks first, then the menu in its own order. */
export function popular(menu: MenuDish[], featured: string[], n = 4): Answer {
  const byId = new Map(menu.map((d) => [d.id.toLowerCase(), d]));
  const picks = featured.map((id) => byId.get(id.toLowerCase())).filter((d): d is MenuDish => Boolean(d));
  const list = [...picks, ...menu.filter((d) => !picks.includes(d))].slice(0, n);
  if (!list.length) return { text: "The menu looks empty right now. The staff will be happy to help.", cards: [] };
  return { text: picks.length ? 'Here are the venue’s top picks for you:' : 'Here are a few favourites from the menu:', cards: ids(list) };
}

export function price(topic: string | null | undefined, menu: MenuDish[]): Answer {
  if (!topic) return { text: 'Sure! Which dish would you like the price of?', cards: [] };
  const r = resolveMention(topic, menu);
  if (r.status === 'ok') return { text: `${r.dish.name} is ${rupees(Number(r.dish.price) || 0)}.`, cards: [r.dish.id], chips: [`Add ${r.dish.name}`.slice(0, 48)] };
  if (r.status === 'ambiguous') return { text: r.options.map((d) => `${d.name} ${rupees(Number(d.price) || 0)}`).join(' · '), cards: ids(r.options) };
  return { text: `Sorry, I couldn't find "${topic}" on today's menu.`, cards: ids(r.nearest) };
}

export function describe(topic: string | null | undefined, menu: MenuDish[]): Answer {
  if (!topic) return { text: 'Happy to help! Which dish would you like to know about?', cards: [] };
  const r = resolveMention(topic, menu);
  if (r.status === 'ok') {
    const about = (r.dish.description || '').replace(/\s+/g, ' ').trim().slice(0, 220);
    const text = about ? `${r.dish.name}: ${about}` : `${r.dish.name} is on the menu at ${rupees(Number(r.dish.price) || 0)}. The staff can tell you more about it.`;
    return { text, cards: [r.dish.id], chips: [`Add ${r.dish.name}`.slice(0, 48)] };
  }
  if (r.status === 'ambiguous') return { text: 'We have a few of those. Which one did you mean?', cards: ids(r.options), chips: r.options.map((d) => `What is ${d.name}`.slice(0, 48)) };
  return { text: `Sorry, I couldn't find "${topic}" on today's menu.`, cards: ids(r.nearest) };
}

/** Dishes for a diet, decided by the menu's own words. Veg is never promised: only "no meat, fish or egg mentioned". */
function byDiet(topic: string, menu: MenuDish[]): Answer | null {
  const req = dietRequest(topic);
  if (!req) return null;
  const found = dishesForDiet(menu, req).map((x) => x.dish);
  const what = req.word ?? (req.want === 'non_veg' ? 'non-veg' : req.want === 'egg' ? 'egg' : 'veg');
  if (!found.length) {
    return req.want === 'veg'
      ? { text: 'Every dish here mentions meat, fish or egg, so I can’t suggest a veg one. The staff can help you choose.', cards: [], staff: 'dietary' }
      : { text: `I couldn’t find any ${what} dishes on this menu. No dish here mentions ${req.word ?? (req.want === 'egg' ? 'egg' : 'chicken, mutton, fish, prawns or egg')}. Would you like me to ask the staff?`, cards: [], staff: 'dietary' };
  }
  if (req.want === 'veg') {
    return { text: 'These dishes don’t mention any meat, fish or egg on the menu. If you need strictly veg, Jain or allergy-safe food, please confirm with the staff.', cards: ids(found.slice(0, 8)) };
  }
  return { text: `Here ${found.length === 1 ? 'is the' : 'are the'} ${what} ${found.length === 1 ? 'dish' : 'dishes'} on the menu:`, cards: ids(found.slice(0, 8)) };
}

/** Dishes of a diet ("non veg"), a kind ("desserts"), a menu category ("pasta"), or failing that, matching names. */
export function browse(topic: string | null | undefined, menu: MenuDish[]): Answer {
  const diet = topic ? byDiet(topic, menu) : null;
  if (diet) return diet;
  const words = dishTokens(topic || '').filter((w) => !isDietWord(w));
  if (!words.length) return popular(menu, []);
  const match = matchBrowse(topic || '', menu);
  if (match.dishes.length) {
    const label = CONCEPT_LABEL[match.concepts[0]] ?? `"${topic}"`;
    const text = match.coldFirst && match.concepts.includes('drink')
      ? 'Here are some cold drinks you might enjoy:'
      : `Here’s what we have for ${label}:`;
    return { text, cards: ids(match.dishes.slice(0, 8)) };
  }
  // Nothing on this menu shares that concept. Say so, and offer what the menu does have. Never a guess.
  const cats = venueCategories(menu, 5);
  if (cats.length) {
    const asked = CONCEPT_LABEL[match.concepts[0]] ?? `"${topic}"`;
    return {
      text: `We don’t have ${asked} on this menu. Here’s what we do have: ${cats.join(', ')}.`,
      cards: [],
      chips: cats.slice(0, 3).map((c) => `Show ${c}`.slice(0, 48)),
    };
  }
  const list = rankDishes(topic || '', menu, 6).filter((s) => s.score >= FLOOR).map((s) => s.dish);
  if (list.length) return { text: `Here’s what matches "${topic}":`, cards: ids(list.slice(0, 8)) };
  return { text: `Sorry, I couldn’t find "${topic}" on this menu.`, cards: [] };
}

const ASKS_VEG = /\b(veg|vegetarian|nonveg|non veg|meat|egg|anda|chicken|fish)\b/i;

/**
 * A dietary question. When the guest asks whether a named dish is veg and the menu's own words settle it ("Chicken Roll"
 * names chicken), Vibey says so with the word that proves it. Everything else (allergies, spice, Jain, a dish whose text
 * names no meat, fish or egg) goes to the staff: Vibey does not guess.
 */
export function dietary(text: string, menu: MenuDish[]): Answer {
  const handoff: Answer = {
    text: 'I don’t want to guess about ingredients, allergies or spice levels. The staff can tell you for sure. Shall I call someone to your table?',
    cards: [], staff: 'dietary',
  };
  const strict = /\ballerg|spic|jain|gluten|lactose|dairy|nut/i.test(text);
  const vegan = /\bvegan\b/i.test(text);
  if (strict || (!vegan && !ASKS_VEG.test(text))) return handoff;
  const dishWords = dishTokens(text).filter((w) => !isDietWord(w) && !['is', 'it', 'kya', 'hai', 'does', 'have', 'contain', 'vegan'].includes(w)).join(' ');
  const r = dishWords ? resolveMention(dishWords, menu) : null;
  if (r?.status !== 'ok') return handoff;
  // The venue said what the dish is: Vibey repeats that, and says who said it.
  const saved = r.dish.dietary;
  if (saved === 'veg' || saved === 'vegan' || saved === 'egg' || saved === 'non_veg') {
    const said = facetsOf(r.dish).diet;
    const card = { cards: [r.dish.id], chips: [`Add ${r.dish.name}`.slice(0, 48)] };
    if (vegan) return said === 'vegan' ? { text: `Yes, ${r.dish.name} is marked vegan by the venue.`, ...card } : { ...handoff, text: `${r.dish.name} isn’t marked vegan (the venue lists it as ${said === 'veg' ? 'vegetarian' : said === 'egg' ? 'containing egg' : 'non-vegetarian'}). The staff can tell you about dairy and other ingredients. Shall I call someone?`, cards: [r.dish.id] };
    if (said === 'veg' || said === 'vegan') return { text: `Yes, ${r.dish.name} is vegetarian (marked by the venue). For allergies or Jain food, please check with the staff.`, ...card };
    if (said === 'egg') return { text: `${r.dish.name} contains egg, so it isn’t vegetarian.`, cards: [r.dish.id] };
    return { text: `No, ${r.dish.name} is non-vegetarian.`, cards: [r.dish.id] };
  }
  if (vegan) return handoff;
  const fact = dietOf(r.dish);
  if (fact.diet === 'not_mentioned') return { ...handoff, text: `The menu doesn’t mention meat, fish or egg for ${r.dish.name}, but I can’t promise it’s strictly veg. The staff can confirm. Shall I call someone?`, cards: [r.dish.id] };
  return { text: `${r.dish.name} is not veg: the menu mentions ${fact.evidence} for it.`, cards: [r.dish.id] };
}

export const WAIT_TIME: Answer = {
  text: 'I don’t have the kitchen’s preparation times, so I won’t guess. The staff can tell you exactly. Shall I ask them?',
  cards: [], staff: 'other',
};

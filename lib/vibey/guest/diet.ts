// Veg / non-veg, decided only by what the venue's own menu says. A dish is non-veg or egg when its name, category or
// description names a meat, fish or egg; the word that proved it is kept as evidence. Nothing is ever called veg on
// Vibey's own authority: a dish with no such word is "no meat, fish or egg mentioned", and strict needs (Jain,
// allergies) always go to the staff. No model is involved, so this cannot be hallucinated.
import { normalise } from './text';
import type { MenuDish } from './retrieve';

export type Diet = 'non_veg' | 'egg' | 'not_mentioned';
export type DietRequest = 'non_veg' | 'egg' | 'veg';

const MEAT = ['chicken', 'murg', 'murgh', 'mutton', 'lamb', 'goat', 'gosht', 'keema', 'kheema', 'beef', 'pork', 'bacon', 'ham',
  'salami', 'pepperoni', 'sausage', 'sausages', 'meat', 'meatball', 'meatballs', 'fish', 'machli', 'machhi', 'prawn', 'prawns',
  'shrimp', 'shrimps', 'crab', 'lobster', 'seafood', 'tuna', 'salmon', 'surmai', 'pomfret', 'squid', 'calamari', 'turkey', 'duck'];
const EGG = ['egg', 'eggs', 'anda', 'ande', 'omelette', 'omelet', 'bhurji'];
const MEAT_SET = new Set(MEAT);
const EGG_SET = new Set(EGG);

const DIET_WORDS = new Set(['nonveg', 'veg', 'vegetarian', 'veggie', 'shakahari', 'pureveg']);
/** A word that only says what kind of food (meat, fish, egg, veg), not which dish. */
export const isDietWord = (w: string) => DIET_WORDS.has(w) || MEAT_SET.has(w) || EGG_SET.has(w);

/** "non veg", "non-veg" and "nonveg" are one word, so "veg" inside it never matches a veg dish. */
export const joinNonVeg = (text: string) => text.replace(/\bnon[\s-]*veg(etarian)?\b/gi, 'nonveg');

const wordsOf = (text: string) => normalise(joinNonVeg(text)).split(' ').filter(Boolean);

export interface DietFact { diet: Diet; evidence: string | null }

/** What the menu's own words say about one dish. */
export function dietOf(d: Pick<MenuDish, 'name' | 'category' | 'description'>): DietFact {
  // Any meat, fish or egg word anywhere in the dish's text counts: wrongly calling a dish non-veg is a missed suggestion,
  // wrongly offering it as meat-free is a broken promise. "Eggless" / "no egg" is the one phrase that clears egg.
  const words = wordsOf(`${d.name} ${d.category ?? ''} ${d.description ?? ''}`);
  if (words.includes('nonveg')) return { diet: 'non_veg', evidence: 'non-veg' };
  const meat = words.find((w) => MEAT_SET.has(w));
  if (meat) return { diet: 'non_veg', evidence: meat };
  const eggFree = /\b(eggless|egg[\s-]?free|without eggs?|no eggs?)\b/i.test(`${d.name} ${d.description ?? ''}`);
  const egg = eggFree ? undefined : words.find((w) => EGG_SET.has(w));
  if (egg) return { diet: 'egg', evidence: egg };
  return { diet: 'not_mentioned', evidence: null };
}

/** The diet a guest is asking for, if any ("kuch non veg", "veg options", "anda wala"); also a specific meat word. */
export function dietRequest(text: string): { want: DietRequest; word: string | null } | null {
  const w = wordsOf(text);
  if (w.includes('nonveg')) return { want: 'non_veg', word: null };
  const meat = w.find((x) => MEAT_SET.has(x));
  if (meat) return { want: 'non_veg', word: meat === 'meat' ? null : meat };
  const egg = w.find((x) => EGG_SET.has(x));
  if (egg) return { want: 'egg', word: null };
  if (w.some((x) => ['veg', 'vegetarian', 'veggie', 'shakahari', 'pureveg'].includes(x))) return { want: 'veg', word: null };
  return null;
}

/** The dishes that fit a diet request, with the word that proved each one (none for veg: nothing is claimed). */
export function dishesForDiet(menu: MenuDish[], req: { want: DietRequest; word: string | null }): Array<{ dish: MenuDish; fact: DietFact }> {
  return menu.map((dish) => ({ dish, fact: dietOf(dish) })).filter(({ dish, fact }) => {
    if (req.want === 'veg') return fact.diet === 'not_mentioned';
    if (req.want === 'egg') return fact.diet === 'egg';
    if (req.word) return wordsOf(`${dish.name} ${dish.category ?? ''} ${dish.description ?? ''}`).includes(req.word);
    return fact.diet === 'non_veg' || fact.diet === 'egg';
  });
}

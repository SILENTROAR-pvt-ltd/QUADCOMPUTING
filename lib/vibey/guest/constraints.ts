// What a guest wants, beyond a dish name, read from their own words: a diet, spicy or mild, a price limit, cold or hot,
// light, a kind of food ("drinks", "pasta") and ingredients the menu has ("mushroom", "paneer"). Rules only, so the same
// words always mean the same thing; a word the menu never uses is never treated as an ingredient.
import type { DietChoice } from '@/lib/guest/diet-filter';
import { conceptsOf } from './concepts';
import { dietRequest, isDietWord } from './diet';
import { CATEGORY_CONCEPTS, STOP_CONCEPTS } from './lexicon';
import { dishTokens, normalise } from './text';
import type { MenuDish } from './retrieve';

export interface Constraints {
  diet?: DietChoice;
  spicy?: boolean;
  mild?: boolean;
  maxPrice?: number;
  minPrice?: number;
  cheap?: boolean;
  cold?: boolean;
  hot?: boolean;
  light?: boolean;
  /** Kinds of food the guest named (lexicon concepts: "drink", "pasta", "breakfast"…). */
  concepts: string[];
  /** Words the guest used that appear in this menu's dishes ("mushroom", "chocolate"). */
  ingredients: string[];
}

const SPICY = /\b(spicy|spice|teekha|tikha|teekhi|tikhi|chatpata|chatpati|fiery|masaledar|hot and spicy)\b/;
// A child's plate is a mild one ("for my kid", "bachon ke liye").
const MILD = /\b(mild|not spicy|non spicy|less spicy|kam teekha|kam tikha|bland|no spice|without spice|for (my |the )?(kids?|child|children|son|daughter)|kids|bachon|bacho|bachche|bacche|baccha)\b/;
const LIGHT = /\b(light|halka|halki|healthy|not heavy|low cal|low calorie|on a diet|diet friendly|gym|less oil|low oil|kam tel)\b/;
const CHEAP = /\b(cheap|cheaper|cheapest|sasta|sasti|saste|budget|affordable|economical|pocket friendly|less expensive|low price|lower price|kam daam|kam price|value for money)\b/;
const DRINK_VERB = /\b(pila|pilao|pila do|pilado|pilaiye|peena|peene|piyenge|piyunga|piyungi|sip)\b/;
const HOT = /\b(hot|garam|warm)\b/;
const MAX = /(?:under|below|less than|within|upto|up to|max(?:imum)?|budget(?: of)?|not more than|cheaper than)\s*(?:rs\.?|inr|₹)?\s*(\d{2,5})|(\d{2,5})\s*(?:rs|rupees|inr|₹)?\s*(?:se kam|tak|ke andar|or less|ke niche|ke neeche|max)\b/;
const MIN = /(?:above|over|more than|at least|minimum)\s*(?:rs\.?|inr|₹)?\s*(\d{2,5})/;

/** Words that only shape the request ("suggest something under 150"), never an ingredient. */
const REQUEST_WORDS = new Set(['suggest', 'recommend', 'something', 'anything', 'under', 'below', 'less', 'than', 'within', 'upto', 'up',
  'max', 'budget', 'cheap', 'sasta', 'spicy', 'mild', 'light', 'healthy', 'hot', 'warm', 'cold', 'good', 'nice', 'best', 'popular',
  'pila', 'pilao', 'peena', 'what', 'which', 'show', 'have', 'any', 'option', 'dish', 'food', 'item', 'rs', 'rupee', 'inr', 'kuch']);

/** Everyday words that also turn up in descriptions ("the way you remember"): never an ingredient. */
const COMMON = new Set(['you', 'your', 'way', 'it', 'its', 'is', 'are', 'was', 'be', 'this', 'that', 'than', 'then', 'what', 'which',
  'who', 'how', 'when', 'where', 'in', 'on', 'at', 'by', 'from', 'into', 'out', 'up', 'down', 'over', 'under', 'all', 'any', 'each',
  'every', 'very', 'so', 'as', 'too', 'no', 'not', 'yes', 'served', 'serve', 'made', 'make', 'fresh', 'classic', 'house', 'our',
  'we', 'us', 'they', 'them', 'remember', 'love', 'loved', 'perfect', 'golden', 'soft', 'rich', 'light', 'right', 'here']);

const vocabCache = new WeakMap<MenuDish[], Set<string>>();
/** The words this menu's dish names use: an ingredient is a word the guest said that a dish is named for. */
function menuVocab(menu: MenuDish[]): Set<string> {
  let v = vocabCache.get(menu);
  if (!v) {
    // Names, plus food words from descriptions ("mushroom" in "Mushroom pasta baked under cheese"), never everyday words.
    v = new Set([...menu.flatMap((d) => dishTokens(d.name)), ...menu.flatMap((d) => dishTokens(d.description ?? '')).filter((w) => conceptsOf(w).size > 0)]);
    COMMON.forEach((w) => v!.delete(w));
    vocabCache.set(menu, v);
  }
  return v;
}

export function parseConstraints(text: string, menu: MenuDish[]): Constraints {
  const t = normalise(text.replace(/₹/g, ' rs '));
  const out: Constraints = { concepts: [], ingredients: [] };
  const diet = dietRequest(t);
  if (/\bvegan\b/.test(t)) out.diet = 'vegan';
  else if (diet) out.diet = diet.want === 'non_veg' ? 'non_veg' : diet.want === 'egg' ? 'egg' : 'veg';
  if (MILD.test(t)) out.mild = true;
  else if (SPICY.test(t)) out.spicy = true;
  if (LIGHT.test(t)) out.light = true;
  if (CHEAP.test(t)) out.cheap = true;
  const max = MAX.exec(t);
  if (max) out.maxPrice = Number(max[1] ?? max[2]);
  const min = MIN.exec(t);
  if (min) out.minPrice = Number(min[1]);

  const concepts = conceptsOf(t);
  STOP_CONCEPTS.forEach((c) => concepts.delete(c));
  if (DRINK_VERB.test(t)) concepts.add('drink');
  if (concepts.has('cold')) out.cold = true;
  // "hot" is a temperature with a drink or soup, and spice otherwise ("something hot" at a curry house).
  if (HOT.test(t)) { if (concepts.has('drink') || concepts.has('soup') || concepts.has('tea') || concepts.has('coffee')) out.hot = true; else out.spicy = true; }
  out.concepts = Array.from(concepts).filter((c) => CATEGORY_CONCEPTS.has(c) && c !== 'veg' && c !== 'nonveg');
  if (out.cold && !out.concepts.length) out.concepts = ['drink'];

  const vocab = menuVocab(menu);
  const conceptWords = new Set(out.concepts.flatMap((c) => dishTokens(c)));
  out.ingredients = Array.from(new Set(dishTokens(t).filter((w) => vocab.has(w) && !REQUEST_WORDS.has(w) && !isDietWord(w)
    && !conceptWords.has(w) && !CATEGORY_CONCEPTS.has(w) && !conceptsOf(w).has('drink')))).slice(0, 4);
  // A meat named on its own ("chicken dishes") narrows non-veg to that meat, when the menu has it.
  if (diet?.word && vocab.has(diet.word) && !out.ingredients.includes(diet.word)) out.ingredients.push(diet.word);
  return out;
}

/** True when the guest set any limit at all (beyond naming a kind of food). */
export const hasLimits = (c: Constraints) => Boolean(c.diet || c.spicy || c.mild || c.maxPrice || c.minPrice || c.cheap || c.cold || c.hot || c.light || c.ingredients.length);

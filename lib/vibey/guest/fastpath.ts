// The rule parser for the messages most guests send ("2 cold coffee aur ek chai less sugar", "remove the pasta",
// "one more", "what's popular?"). When it recognises the shape, no model is needed. When it does not, it returns null
// and the model reads the message instead. It never decides which dish: it only cuts the message into phrases.
import { dishTokens, FILLER, normalise, NUMBER_WORDS, tokenMatch } from './text';
import { dietRequest, isDietWord } from './diet';
import { resolveMention } from './resolve';
import { conceptsOf } from './concepts';
import { CATEGORY_CONCEPTS } from './lexicon';
import { clampQty, type Mention, type Understood } from './schema';
import type { MenuDish } from './retrieve';

export const SAME_AS_LAST = '__same__';

const GREETING = /^(hi+|hello+|hey+|namaste|namaskar|hola|yo|good (morning|afternoon|evening))( vibey)?$/;
const THANKS = /^(thanks?|thank you|thank u|thx|ty|shukriya|dhanyavaad|dhanyawad|great|cool|nice|awesome|ok thanks)( (so much|a lot|vibey))?$/;
const STAFF = /\b(waiter|staff|manager|someone|server)\b.*\b(call|bulao|bula|bhejo|send|please|chahiye)\b|\b(call|bulao|bula|send|need)\b.*\b(waiter|staff|manager|someone|server)\b|^(help|need help|help me)$/;
const CHECKOUT = /^(that s all|thats all|that is all|that s it|thats it|bas|bas itna|bas yahi|done|checkout|check out|place (the |my )?order|order (kar do|kardo|karo|now|it)|review( order)?|confirm( order)?)$/;
const DIETARY = /\b(allerg\w*|gluten|lactose|vegan|jain|nut|nuts|peanut\w*|dairy|vegetarian|veg|non veg|nonveg|egg|eggless|contain\w*|spicy|halal)\b/;
const ASKING = /\?|^(is|are|does|do you|can|kya)\b|\b(hai kya|contain|have any|any)\b/;
const POPULAR = /\b(popular|recommend\w*|suggest\w*|best ?seller\w*|bestseller\w*|famous|signature|must try|special\w*|what s good|whats good|kya accha)\b/;
const PRICE = /\b(how much|price|prices|kitna|kitne|kitni|cost|costs|rate)\b/;
const DESCRIBE = /^(what is|what s|whats|tell me about|describe|explain)\b|\b(kya hai|kya hota hai)$/;
const BROWSE = /^(show( me)?|see|list|any|what|which)\b|\b(do you have|have you got|kya kya hai|menu|options|dikhao|dikha do|dikhana|batao|bata do)\b/;
const QUESTION = /\?|\b(what|which|why|how|when|where|kya|kaun|kaise|kab|kahan|kyun|do you|can you|is there)\b/;
const SAME = /^(one more|ek aur|aur ek|another one|same again|same|repeat|one more of the same|ek aur wahi)( please| plz)?$/;
const REMOVE = /\b(remove|delete|cancel|hatao|hata do|hata|nikalo|nikal do|minus|drop|don t want|dont want|nahi chahiye|nahin chahiye)\b/g;
const NUM = `(\\d{1,2}|${Object.keys(NUMBER_WORDS).join('|')})`;
const SET_QTY = new RegExp(`^(?:make|change)\\s+(?:(?:it|that)\\s+)?(?:to\\s+)?${NUM}(?:\\s+(.*))?$|^(?:make|change)\\s+(.+?)\\s+(?:to\\s+)?${NUM}$`);
const NOTE_PRE = /\b(?:with\s+)?(less|no|without|extra|kam|zyada|jyada|bina|light|strong|kadak)\s+([a-z]+)(?:\s+ke)?\b/g;
const NOTE_POST = /\b([a-z]+)\s+(kam|zyada|jyada|nahi|nahin)\b/g;
const SPLIT = /\s*(?:,|\band\b|\baur\b|\bplus\b)\s*/;
const LEAD = /^(?:(?:actually|please|pls|plz|ok|okay|and|sorry|oh|hey|bhai|bhaiya|yaar|just|can you|could you)\s+)+/;

// Any written number counts (and is clamped to the most one message may add); words come from NUMBER_WORDS.
export const TIME = /\b(avg|average|how long|how much time|kitna time|kitni der|kitne der|kitni deir|waiting time|wait time|prep time|preparation time|ready in|kab tak|time lagega|time lagegi|lagega|lagegi|eta)\b/;
const KIND_HINT = /\b(thanda|thandi|thande|cold|chilled|peena|peene|piyenge|drinks?|beverages?|meetha|meethi|sweets?|desserts?|starters?|snacks?)\b/;

/** Words that ask for "something" rather than name a dish. */
const GENERIC = new Set(['kuch', 'koi', 'something', 'anything', 'dish', 'dishes', 'item', 'items', 'option', 'options', 'food',
  'khana', 'available', 'milega', 'milegi', 'hai', 'kya', 'show', 'any', 'wala', 'wali', 'chahiye', 'want', 'wnt', 'need', 'some', 'got',
  'suggest', 'karoge', 'karo', 'recommend', 'batao', 'bataiye', 'please', 'what', 'which', 'mujhe', 'something', 'good', 'nice', 'accha']);

/**
 * True when every word is a food-kind or request word (no digit, no number word, no dish name), and at least one is a
 * kind of food ("indian main course", "sandwiches"). Such a message asks to see a kind, it does not order.
 */
function isCategoryAsk(t: string, menu: MenuDish[]): boolean {
  if (namesDish(t, menu)) return false;
  let category = false;
  for (const w of t.split(' ').filter(Boolean)) {
    if (w in NUMBER_WORDS || /\d/.test(w)) return false;
    const concepts = conceptsOf(w);
    if (!concepts.size) { if (!FILLER.has(w)) return false; continue; }
    if (Array.from(concepts).some((c) => CATEGORY_CONCEPTS.has(c))) category = true;
  }
  return category;
}

/** Words that say what kind of dish ("cold", "drink", "sweet"), not which one. */
const KIND = new Set(['cold', 'drink', 'beverage', 'peena', 'peene', 'piyenge', 'sweet', 'dessert', 'starter', 'snack', 'avg', 'average', 'time']);

/**
 * True when the message names a dish: at least half of its telling words (kind, diet and generic words aside) belong to
 * the menu's dish names. "2 cold coffee" names one; "kuch thanda peena hai, suggest karo" does not, even on a menu with a
 * Cold Coffee, because "cold" only says what kind.
 */
function namesDish(t: string, menu: MenuDish[]): boolean {
  const words = dishTokens(t).filter((w) => !isDietWord(w) && !GENERIC.has(w) && !KIND.has(w));
  if (!words.length) return false;
  const names = Array.from(new Set(menu.flatMap((d) => dishTokens(d.name))));
  const hits = words.filter((w) => names.some((n) => n === w || tokenMatch(w, n) >= 0.9)).length;
  return hits > 0 && hits * 2 >= words.length;
}

/** True when the message changes the tray (make/change/remove) or one of its phrases is a dish on the menu. */
function ordersSomething(text: string, t: string, menu: MenuDish[]): boolean {
  if (SET_QTY.test(t.replace(LEAD, '')) || t.replace(REMOVE, ' ') !== t) return true;
  return (splitMentions(text, menu) ?? []).some((m) => resolveMention(m.dish_words, menu).status === 'ok');
}

/** The kind or topic a browse is about, without the asking words ("show desserts" -> "desserts"). */
const topicOf = (t: string) => t.replace(BROWSE, ' ')
  .replace(/\b(me|you|the|some|all|your|do|have|got|kya|hai|for|mujhe|kuch|please|suggest|karoge|karo|recommend|batao|koi|any)\b/g, ' ')
  .replace(/\s+/g, ' ').trim().slice(0, 40);

const qtyWord =(w: string | undefined) => (w === undefined ? null : /^\d{1,4}$/.test(w) ? clampQty(Number(w)) : NUMBER_WORDS[w] ?? null);

/**
 * A segment's quantity and what is left: the last number among the filler words before the dish ("yaar do thandi
 * coffee", "can I get a coffee"), or a trailing number ("coffee x2"). A number after the dish is never read as a word
 * ("chai do" is "give tea", not "2 tea").
 */
function takeQty(seg: string): { qty: number | null; rest: string } {
  const words = seg.split(' ').filter(Boolean);
  let qty: number | null = null;
  let i = 0;
  for (; i < words.length - 1; i += 1) {
    const n = qtyWord(words[i]);
    if (n !== null) qty = n;
    else if (!FILLER.has(words[i])) break;
  }
  if (qty !== null) return { qty, rest: words.slice(i).join(' ') };
  const m = /^(.*\S)\s+x?(\d{1,2})x?$/.exec(seg);
  if (m) return { qty: Number(m[2]), rest: m[1] };
  // A number followed by a unit counts wherever it is ("thandi coffee do glass").
  const unit = new RegExp(`^(.*?)\\s*\\b${NUM}\\s+(glass|glasses|cup|cups|plate|plates|piece|pieces|pcs|bottle|bottles)$`).exec(seg);
  if (unit) return { qty: qtyWord(unit[2]), rest: unit[1] };
  return { qty: null, rest: seg };
}

/** Kitchen notes ("less sugar", "cheeni kam"), unless those words are part of the dish's own name. */
function takeNotes(rest: string, menu: MenuDish[]): { note: string | null; rest: string } {
  if (menu.some((d) => normalise(d.name) === rest)) return { note: null, rest };
  const notes: string[] = [];
  let left = rest.replace(NOTE_PRE, (all) => { notes.push(all.replace(/^with\s+/, '')); return ' '; });
  left = left.replace(NOTE_POST, (all) => { notes.push(all); return ' '; });
  return { note: notes.length ? notes.join(', ').slice(0, 60) : null, rest: left.replace(/\s+/g, ' ').trim() };
}

/** Cuts a message into dish phrases. Null if any piece names no dish (the model reads those). */
export function splitMentions(text: string, menu: MenuDish[], withNotes = true): Mention[] | null {
  // Commas separate dishes too, so they become joiners before normalise() drops them. Dish names containing "and"
  // ("Mac and Cheese") are kept whole.
  let norm = normalise(text.replace(/[&+,;]/g, ' and '));
  for (const d of menu) {
    const n = normalise(d.name);
    // "_" is a word character, so the joiners inside the name stop being separate words; normalise() leaves none behind.
    if (/\b(and|aur|plus)\b/.test(n) && norm.includes(n)) norm = norm.split(n).join(n.replace(/ /g, '_'));
  }
  const mentions: Mention[] = [];
  for (const raw of norm.split(SPLIT).map((s) => s.replace(/_/g, ' ').trim()).filter(Boolean)) {
    const { qty, rest } = takeQty(raw);
    const { note, rest: dish } = withNotes ? takeNotes(rest, menu) : { note: null, rest };
    if (!dishTokens(dish).length) {
      // A note or a count on its own ("2 cold coffee, less sugar", "thandi coffee, do glass") belongs to the dish before it.
      const last = mentions[mentions.length - 1];
      if (last && note && qty === null) { last.note = [last.note, note].filter(Boolean).join(', ').slice(0, 60); continue; }
      if (last && qty !== null && last.qty == null && !note) { last.qty = clampQty(qty); continue; }
      return null;
    }
    mentions.push({ dish_words: dish.slice(0, 80), qty: qty === null ? null : clampQty(qty), note });
  }
  return mentions.length && mentions.length <= 10 ? mentions : null;
}

export function fastParse(text: string, menu: MenuDish[]): Understood | null {
  const t = normalise(text.replace(/[&+]/g, ' and '));
  if (!t) return null;
  if (GREETING.test(t) || THANKS.test(t)) return { intent: 'smalltalk', mentions: [] };
  if (STAFF.test(t)) return { intent: 'call_staff', mentions: [] };
  if (CHECKOUT.test(t)) return { intent: 'checkout', mentions: [] };
  // normalise() drops the question mark, so it is looked for in what the guest typed.
  const asked = /\?/.test(text) || ASKING.test(t);
  if (/\ballerg/.test(t)) return { intent: 'ask', question: 'dietary', topic: t.slice(0, 40), mentions: [] };
  // "i want some non veg", "veg options?", "kuch chicken": a diet and no dish named is a request to see those dishes.
  const diet = dietRequest(t);
  // A meat word with other dish words ("butter chicken") names a dish; with only generic words ("kuch chicken") it is a diet.
  const namedMeatDish = Boolean(diet?.word) && dishTokens(t).some((w) => !isDietWord(w) && !GENERIC.has(w));
  if (diet && !namedMeatDish && !namesDish(t, menu)) return { intent: 'browse', topic: diet.word ?? (diet.want === 'non_veg' ? 'non veg' : diet.want), mentions: [] };
  if (DIETARY.test(t) && asked) return { intent: 'ask', question: 'dietary', topic: t.slice(0, 40), mentions: [] };
  // "avg time?", "kitni der lagegi": Vibey has no kitchen timings and says so, unless the message also orders a dish.
  if (TIME.test(t) && !namesDish(t, menu)) return { intent: 'ask', question: 'wait_time', mentions: [] };
  if (PRICE.test(t)) return { intent: 'ask', question: 'price', topic: t.replace(PRICE, ' ').replace(/\b(is|of|the|for|a|hai|ka|ki|ke)\b/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40), mentions: [] };
  // "what's popular?" (and not "suggest something cold", which names a kind and is a browse below).
  if (POPULAR.test(t) && !KIND_HINT.test(t)) return { intent: 'ask', question: 'popular', mentions: [] };
  if (DESCRIBE.test(t)) return { intent: 'ask', question: 'describe', topic: t.replace(DESCRIBE, ' ').trim().slice(0, 40), mentions: [] };
  // "kuch thanda peena hai (suggest karo)": a kind of dish, no order shape, and no phrase that is a dish on the menu.
  if (KIND_HINT.test(t) && !ordersSomething(text, t, menu)) return { intent: 'browse', topic: topicOf(t) || t.slice(0, 40), mentions: [] };
  // "INDIAN MAIN COURSE", "sandwiches": only words for kinds of food, no quantity, no dish name, no change to the tray.
  if (isCategoryAsk(t, menu) && !ordersSomething(text, t, menu)) return { intent: 'browse', topic: t.slice(0, 40), mentions: [] };
  if (POPULAR.test(t)) return { intent: 'ask', question: 'popular', mentions: [] };
  if (SAME.test(t)) return { intent: 'add', mentions: [{ dish_words: SAME_AS_LAST, qty: 1, note: null }] };
  if (BROWSE.test(t)) {
    const topic = t.replace(BROWSE, ' ').replace(/\b(me|you|the|some|all|your|do|have|got|kya|hai|for)\b/g, ' ').replace(/\s+/g, ' ').trim();
    return topic ? { intent: 'browse', topic: topic.slice(0, 40), mentions: [] } : { intent: 'ask', question: 'popular', mentions: [] };
  }
  if (/\?/.test(text) || QUESTION.test(t)) return null;

  // "actually make the cold coffee 3": openers do not change what the guest asks for.
  const set = SET_QTY.exec(t.replace(LEAD, ''));
  if (set) {
    const qty = qtyWord(set[1]) ?? qtyWord(set[4]);
    const words = (set[2] ?? set[3] ?? '').trim();
    if (qty !== null) return { intent: 'set_qty', mentions: [{ dish_words: words || SAME_AS_LAST, qty: clampQty(qty), note: null }] };
  }
  const withoutRemove = t.replace(REMOVE, ' ');
  if (withoutRemove !== t) {
    const mentions = splitMentions(withoutRemove, menu, false);
    return mentions ? { intent: 'remove', mentions } : null;
  }
  const mentions = splitMentions(text, menu);
  return mentions ? { intent: 'add', mentions } : null;
}

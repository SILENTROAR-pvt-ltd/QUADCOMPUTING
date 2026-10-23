// The conversation rules that run before the order parser: the tray's total, clearing it, events, what goes with a dish,
// switching a dish's size or style ("make it half"), "that one" / "the second one", and an answer to the question Vibey
// just asked ("2 momos" -> "steamed veg" keeps the 2). Each turns into a reading built from menu names only, so nothing a
// guest types can add a dish that is not on the menu.
import { facetsOf, familyOf, variantWord } from './facets';
import { resolveMention } from './resolve';
import { moodParse } from './moods';
import { isPlanAnswer } from './plan-ask';
import { dishTokens, normalise, NUMBER_WORDS } from './text';
import type { MenuDish } from './retrieve';
import type { GuestRequest, Understood, VibeyContext } from './schema';

const KEEP = /\b(except|other than|apart from|but not|keep|leave|chhod ?ke|chod ?ke|ke alawa|ke siwa|siwa)\b/;
const CLEAR = /\b(cancel|remove|clear|empty|delete|hatao|hata do|reset|nikal do|nikalo)\b.*\b(everything|all|sab|sabkuch|sab kuch|saara|sara|whole|entire)\b|^(clear|empty|reset) (my |the )?(tray|cart|order)$|\bstart (over|again)\b/;
const TOTAL = /\b(my total|the total|total kitna|total bill|bill total|order total|tray total|total so far|kitna hua|kitne ka hua|kitna bana|what do i owe|how much (is |for )?(my|the|this) (order|tray|total|bill)|how much do i (owe|pay))\b/;
const EVENTS = /\b(events?|live music|music tonight|dj|karaoke|gig|live band|band tonight|performance|happening tonight|whats happening|what s happening|anything happening|live show)\b/;
const PAIR = /\b(goes? (well |good |nicely )?with|go(es)? (good|nice|well) with|pair(s|ing)? (with|well)|what pairs|along with (it|this|that)|saath (mein|me) kya|with (it|this|that)\??$|what else (should|can|do) (i|we) (get|have|order|try)|anything (else )?to go with|side with)\b/;
const SWAP_VERB = /\b(make it|make that|instead|change|switch|swap|convert|karo|kar do|kardo)\b/;
const ONLY_VARIANT = /^(half|full|steamed|fried|kurkure|dry|gravy|small|medium|large|regular)( plate| please| plz| one| wala| wali| chahiye)?$/;
const SAY_YES = /^(yes|yeah|yep|haan|ha|han|ok|okay|sure|ji|ji haan)( please| plz| add( it)?)?$/;
const ORDINAL: Record<string, number> = { first: 0, '1st': 0, pehla: 0, pehli: 0, second: 1, '2nd': 1, dusra: 1, dusri: 1, third: 2, '3rd': 2, teesra: 2, teesri: 2, fourth: 3, '4th': 3, last: -1 };
const PICK = /^(?:add |yes |ok |haan )?(?:that|this|it|that one|this one|the (first|second|third|fourth|last|1st|2nd|3rd|4th) one|(first|second|third|fourth|1st|2nd|3rd|4th|pehla|pehli|dusra|dusri|teesra|teesri) (one|wala|wali)?|both|dono|all of them|sab)(?: please| plz| one| wala| wali)?$/;

const byId = (menu: MenuDish[]) => new Map(menu.map((d) => [d.id, d]));
const numberIn = (t: string): number | null => {
  const m = /\b(\d{1,2})\b/.exec(t);
  if (m) return Math.min(Number(m[1]), 20);
  const w = t.split(' ').find((x) => x in NUMBER_WORDS && !['a', 'an', 'do'].includes(x));
  return w ? NUMBER_WORDS[w] : null;
};
const add = (dish: MenuDish, qty: number | null): Understood => ({ intent: 'add', mentions: [{ dish_words: dish.name, qty, note: null }] });

/** The words every option's family shares ("momos" for Chicken / Veg / Paneer Momos), to read a short answer in context. */
function sharedWords(options: MenuDish[]): string {
  const sets = options.map((d) => new Set(dishTokens(facetsOf(d).family)));
  return Array.from(sets[0] ?? []).filter((w) => sets.every((s) => s.has(w))).join(' ');
}

/** The dish a size/style change is about: one named in the message, else the last one Vibey added, else the tray's last. */
function swapTarget(t: string, variant: string, menu: MenuDish[], tray: GuestRequest['tray'], ctx: VibeyContext): MenuDish | null {
  const ids = byId(menu);
  const trayDishes = tray.map((l) => ids.get(l.itemId)).filter((d): d is MenuDish => Boolean(d));
  const hasVariant = (d: MenuDish) => familyOf(d, menu).some((x) => facetsOf(x).variant === variant);
  const words = t.split(' ').filter((w) => !variantWord(w) && !SWAP_VERB.test(w)
    && !['it', 'that', 'the', 'to', 'a', 'plate', 'one', 'make', 'change', 'switch', 'swap', 'please', 'plz', 'wala', 'wali'].includes(w)).join(' ');
  if (words) {
    const named = resolveMention(words, trayDishes.length ? trayDishes : menu);
    if (named.status === 'ok' && hasVariant(named.dish)) return named.dish;
    if (named.status === 'ambiguous') return named.options.find(hasVariant) ?? null;
  }
  const last = ctx.last ? ids.get(ctx.last) : undefined;
  if (last && trayDishes.includes(last) && hasVariant(last)) return last;
  return [...trayDishes].reverse().find(hasVariant) ?? null;
}

export function dialogueParse(text: string, menu: MenuDish[], tray: GuestRequest['tray'], context: VibeyContext | undefined): Understood | null {
  const ctx = context ?? { shown: [], pending: null, last: null };
  const t = normalise(text);
  if (!t) return null;
  // An answer to the waiter's question about the table's meal ("Veg", "Chinese", "you choose") comes before everything.
  if (ctx.planAsk && isPlanAnswer(t, ctx.planAsk, menu)) return { intent: 'plan', topic: 'answer', mentions: [] };
  if (tray.length && CLEAR.test(t) && !KEEP.test(t)) return { intent: 'clear_tray', mentions: [] };
  if (TOTAL.test(t)) return { intent: 'tray_total', mentions: [] };
  if (EVENTS.test(t)) return { intent: 'events', mentions: [] };
  if (PAIR.test(t)) {
    const named = t.split(/\bwith\b/)[1]?.trim();
    const r = named && !/^(it|this|that)$/.test(named) ? resolveMention(named, menu) : null;
    return { intent: 'pair', mentions: r?.status === 'ok' ? [{ dish_words: r.dish.name, qty: null, note: null }] : [] };
  }
  const mood = moodParse(t, menu, ctx);
  if (mood) return mood;
  const variant = variantWord(t);
  if (variant && tray.length && (SWAP_VERB.test(t) || ONLY_VARIANT.test(t))) {
    const from = swapTarget(t, variant, menu, tray, ctx);
    if (from && facetsOf(from).variant !== variant) return { intent: 'swap', mentions: [{ dish_words: from.name, qty: null, note: null }], topic: variant };
  }
  const ids = byId(menu);
  const shown = ctx.shown.map((id) => ids.get(id)).filter((d): d is MenuDish => Boolean(d));
  // A question Vibey asked ("which momos?"): the answer is read among those options, and keeps the quantity asked for.
  const pending = (ctx.pending?.ids ?? []).map((id) => ids.get(id)).filter((d): d is MenuDish => Boolean(d));
  if (pending.length) {
    const qty = numberIn(t) ?? ctx.pending!.qty;
    if (SAY_YES.test(t) && pending.length === 1) return add(pending[0], qty);
    const p = PICK.exec(t);
    const ord = p ? ORDINAL[p[1] ?? p[2] ?? ''] : undefined;
    if (ord !== undefined) return add(pending.at(ord) ?? pending[0], qty);
    // The options stand for their whole families: "steamed veg" is read among every size and style of them.
    const expanded = Array.from(new Set(pending.flatMap((d) => familyOf(d, menu))));
    const shared = sharedWords(pending);
    const r = resolveMention(t, expanded);
    if (r.status === 'ok') return add(r.dish, qty);
    if (r.status === 'ambiguous') {
      const fams = Array.from(new Set(r.options.map((d) => facetsOf(d).family)));
      const said = new Set([...dishTokens(t), ...dishTokens(shared)]);
      const covered = fams.filter((f) => dishTokens(f).every((w) => said.has(w)));
      const pick = fams.length === 1 ? fams[0] : covered.length === 1 ? covered[0] : `${dishTokens(t).join(' ')} ${shared}`.trim();
      return { intent: 'add', mentions: [{ dish_words: pick, qty, note: null }] };
    }
    if (shared) {
      const wider = resolveMention(`${t} ${shared}`, menu);
      if (wider.status === 'ok') return add(wider.dish, qty);
    }
  }
  if (shown.length) {
    const p = PICK.exec(t);
    if (p) {
      const word = p[1] ?? p[2];
      const qty = numberIn(t);
      if (/\b(both|dono|all of them|sab)\b/.test(t)) return { intent: 'add', mentions: shown.slice(0, /\b(both|dono)\b/.test(t) ? 2 : 4).map((d) => ({ dish_words: d.name, qty, note: null })) };
      if (word && ORDINAL[word] !== undefined) return add(shown.at(ORDINAL[word]) ?? shown[0], qty);
      if (shown.length === 1) return add(shown[0], qty);
    }
    if (SAY_YES.test(t) && shown.length === 1) return add(shown[0], null);
  }
  if (/\bwhat should (i|we) (eat|have|order|try|get)\b|\bkya (khau|khaun|khaye|khayen|order karu|order karun|lu|loon)\b/.test(t)) {
    return { intent: 'ask', question: 'popular', mentions: [] };
  }
  return null;
}

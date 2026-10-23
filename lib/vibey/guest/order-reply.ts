// Tray changes for the dishes a guest named. Every dish here comes out of the resolver (closed world); a phrase that names
// more than one dish becomes a question, asked the way a waiter would: which kind first ("Chicken, Veg or Paneer momos?"),
// then which size or style, keeping the quantity the guest said for the answer.
import { rupees } from '@/lib/guest/cashback';
import { resolveInTray, resolveMention, FLOOR } from './resolve';
import { rankDishes, type MenuDish } from './retrieve';
import { facetsOf, familyOf } from './facets';
import { SAME_AS_LAST } from './fastpath';
import { dishTokens } from './text';
import type { GuestAction, Mention, Understood, VibeyContext } from './schema';

export interface OrderOutcome {
  text: string;
  actions: GuestAction[];
  cards: string[];
  chips: string[] | null;
  pending: VibeyContext['pending'];
  added: MenuDish[];
}

const qtyName = (qty: number, name: string) => `${qty} × ${name}`;
const list = (parts: string[]) => (parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`);
const shortFamily = (d: MenuDish, shared: Set<string>) =>
  (facetsOf(d).family.split(' ').filter((w) => !shared.has(dishTokens(w)[0] ?? '')).join(' ') || facetsOf(d).family).replace(/\.$/, '').replace(/\.\s/g, ' ');

function target(m: Mention, intent: Understood['intent'], menu: MenuDish[], trayIds: string[]) {
  if (m.dish_words === SAME_AS_LAST) {
    const last = menu.find((d) => d.id === trayIds[trayIds.length - 1]);
    return last ? { status: 'ok' as const, dish: last, score: 1 } : { status: 'none' as const, nearest: [] as MenuDish[] };
  }
  return intent === 'add' ? resolveMention(m.dish_words, menu) : resolveInTray(m.dish_words, menu, trayIds);
}

/** The question for a phrase that fits several dishes: by family when they span families, by size or style within one. */
function clarify(m: Mention, options: MenuDish[], menu: MenuDish[], intent: Understood['intent']) {
  const qty = m.qty ?? 1;
  const lead = intent === 'add' && qty > 1 ? `${qty} ` : '';
  let heads: MenuDish[] = [];
  const seen = new Set<string>();
  for (const s of rankDishes(m.dish_words, menu, 30).filter((x) => x.score >= FLOOR)) {
    const fam = facetsOf(s.dish).family.toLowerCase();
    if (!seen.has(fam)) { seen.add(fam); heads.push(s.dish); }
    if (heads.length >= 6) break;
  }
  // "chicken momos" names the Chicken Momos family exactly; Tandoori Chicken Momos needs a word the guest did not say.
  const said = new Set(dishTokens(m.dish_words));
  const covered = heads.filter((h) => dishTokens(facetsOf(h).family).every((w) => said.has(w)));
  if (covered.length === 1) heads = covered;
  if (heads.length >= 2 && heads.some((h) => familyOf(h, menu).length > 1)) {
    // The everyday kinds first (the families that come in several styles), so they are the ones on the chips.
    heads = [...heads].sort((a, b) => familyOf(b, menu).length - familyOf(a, menu).length);
    const sets = heads.map((h) => new Set(dishTokens(facetsOf(h).family)));
    const shared = new Set(Array.from(sets[0]).filter((w) => sets.every((s) => s.has(w))));
    const names = heads.map((h) => shortFamily(h, shared));
    // The menu's own word for what they share ("momos"), not its stem.
    const noun = facetsOf(heads[0]).family.split(' ').filter((w) => shared.has(dishTokens(w)[0] ?? '')).join(' ').toLowerCase() || 'one';
    return { text: `Which ${noun} would you like: ${list(names)}?`, cards: heads.map((h) => h.id), chips: heads.slice(0, 4).map((h) => `${lead}${facetsOf(h).family}`.slice(0, 48)), pending: { qty, ids: heads.map((h) => h.id) } };
  }
  const family = heads.length === 1 ? familyOf(heads[0], menu) : [];
  if (family.length > 1) {
    const sizes = list(family.map((d) => `${facetsOf(d).variant ?? d.name} ${rupees(Number(d.price) || 0)}`));
    return { text: `${facetsOf(family[0]).family} comes ${sizes}. Which one?`, cards: family.map((d) => d.id), chips: family.slice(0, 4).map((d) => `${lead}${d.name}`.slice(0, 48)), pending: { qty, ids: family.slice(0, 8).map((d) => d.id) } };
  }
  return { text: `We have a few options for "${m.dish_words}". Which one would you like?`, cards: options.map((d) => d.id), chips: options.map((d) => `${lead}${d.name}`.slice(0, 48)), pending: { qty, ids: options.map((d) => d.id) } };
}

export function orderReply(u: Understood, menu: MenuDish[], trayIds: string[]): OrderOutcome {
  const actions: GuestAction[] = [];
  const said: string[] = [];
  const cards: string[] = [];
  const added: MenuDish[] = [];
  let chips: string[] | null = null;
  let pending: VibeyContext['pending'] = null;
  const done: Record<string, string[]> = {};
  const did = (verb: string, what: string) => { (done[verb] ??= []).push(what); };
  for (const m of u.mentions.slice(0, 10)) {
    const r = target(m, u.intent, menu, trayIds);
    if (r.status === 'ok') {
      const inTray = trayIds.includes(r.dish.id);
      const qty = m.qty ?? 1;
      if (u.intent === 'remove') {
        if (!inTray) { said.push(`${r.dish.name} isn't in your tray yet.`); continue; }
        actions.push({ type: 'remove', itemId: r.dish.id, ...(m.qty ? { qty: m.qty } : {}) });
        did('removed', r.dish.name);
      } else if (u.intent === 'set_qty' && inTray) {
        actions.push({ type: 'set_qty', itemId: r.dish.id, qty });
        did('updated', `${r.dish.name} to ${qty}`);
      } else {
        actions.push({ type: 'add', itemId: r.dish.id, qty, ...(m.note ? { note: m.note } : {}) });
        added.push(r.dish);
        did('added', `${qtyName(qty, r.dish.name)}${m.note ? ` (${m.note})` : ''}`);
      }
    } else if (r.status === 'ambiguous') {
      const q = clarify(m, r.options, menu, u.intent);
      said.push(q.text);
      q.cards.forEach((id) => cards.push(id));
      chips ??= q.chips;
      pending ??= q.pending;
    } else if (m.dish_words === SAME_AS_LAST) {
      said.push('Your tray is empty right now. What would you like to have?');
    } else {
      said.push(`Sorry, I couldn't find "${m.dish_words}" on today's menu.${r.nearest.length === 1 ? ' Here’s the closest match:' : r.nearest.length ? ' Here are the closest matches:' : ''}`);
      r.nearest.forEach((d) => cards.push(d.id));
    }
  }
  // Many dishes at once ("add the whole spread"): the count here, the dishes one per line in the tray receipt below.
  // Counted the way the tray summary counts (servings), so "added 6 dishes" and "Your tray: 6 dishes" agree.
  if ((done.added?.length ?? 0) > 2) done.added = [`${actions.reduce((n, a) => n + (a.type === 'add' ? a.qty : 0), 0)} dishes`];
  const parts = Object.entries(done).map(([verb, items]) => `${verb} ${list(items)}`);
  const lead = parts.length ? `Done! I've ${parts.join('; ')}${done.added ? ' to your tray' : ''}.` : '';
  return { text: [lead, ...said].filter(Boolean).join(' '), actions, cards, chips, pending, added };
}

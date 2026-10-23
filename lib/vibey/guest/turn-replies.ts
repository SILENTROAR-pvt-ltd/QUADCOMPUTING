// Vibey's replies for the conversation beyond single orders: the tray's total, clearing it, switching a dish's size or
// style, what goes with a dish, the venue's events and suggestions for a guest's wishes. Every name, price and time comes
// from the venue's own data; the wording is a template, so nothing here can be invented.
import { rupees } from '@/lib/guest/cashback';
import { DIET_LABEL } from '@/lib/guest/diet-filter';
import { facetsOf, familyOf } from './facets';
import { pairWith } from './pairing';
import { recommend, type RecommendCtx } from './recommend';
import { resolveMention } from './resolve';
import { CONCEPT_LABEL } from './lexicon';
import { trayLines, trayTotal, dishCount, type Tray } from './tray';
import type { Constraints } from './constraints';
import type { MenuDish } from './retrieve';
import type { GuestAction } from './schema';

export interface TurnReply { text: string; cards?: string[]; chips?: string[]; actions?: GuestAction[] }
export interface VenueEvent { title: string; starts_at: string; entry_fee: number; is_live_now?: boolean; spots_left?: number | null }

const list = (parts: string[]) => (parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`);
const addChips = (ds: MenuDish[], n = 2) => ds.slice(0, n).map((d) => `Add ${d.name}`.slice(0, 48));
/** One dish per line ("• Cold Coffee · ₹160"); the chat draws each as a row with the price on the right. */
const rows = (ds: MenuDish[]) => ds.map((d) => `• ${d.name} · ${rupees(Number(d.price) || 0)}`).join('\n');

export function trayTotalReply(tray: Tray, menu: MenuDish[]): TurnReply {
  const lines = trayLines(tray, menu);
  if (!lines.length) return { text: 'Your tray is empty right now. Shall I suggest something?', chips: ["What's popular?", 'Show drinks'] };
  const items = lines.map((l) => `• ${l.qty} × ${l.dish.name} · ${rupees(l.amount)}`).join('\n');
  const n = dishCount(lines);
  return {
    text: `You have ${n} ${n === 1 ? 'dish' : 'dishes'}:\n${items}\nThat comes to ${rupees(trayTotal(lines))} before any taxes on the bill.`,
    actions: [{ type: 'open_tray' }], chips: ["That's all", 'What goes well with it?'],
  };
}

export function clearTrayReply(tray: Tray, menu: MenuDish[]): TurnReply {
  const lines = trayLines(tray, menu);
  if (!lines.length) return { text: 'Your tray is already empty.', chips: ["What's popular?"] };
  return {
    text: `Done, I've cleared your tray (${lines.map((l) => l.dish.name).join(', ')}). You can undo that just below if it was a slip.`,
    actions: lines.map((l) => ({ type: 'remove' as const, itemId: l.dish.id })), chips: ["What's popular?", 'Show drinks'],
  };
}

/** "Make it half": the same dish in the size or style asked for, with the same quantity. */
export function swapReply(fromName: string, variant: string | null, tray: Tray, menu: MenuDish[]): TurnReply {
  const r = resolveMention(fromName, menu);
  if (r.status !== 'ok') return { text: 'Which dish should I change? Name it as it appears on the menu.' };
  const family = familyOf(r.dish, menu);
  const to = variant ? family.find((d) => facetsOf(d).variant === variant) : undefined;
  if (!to) {
    const options = family.filter((d) => d.id !== r.dish.id);
    return { text: `${facetsOf(r.dish).family} comes as ${list(family.map((d) => `${facetsOf(d).variant ?? d.name} ${rupees(Number(d.price) || 0)}`))}. Which would you like?`, cards: options.map((d) => d.id), chips: options.slice(0, 3).map((d) => `Make it ${facetsOf(d).variant ?? d.name}`.slice(0, 48)) };
  }
  if (to.id === r.dish.id) return { text: `${r.dish.name} is already in your tray.` };
  const qty = tray.find((l) => l.itemId === r.dish.id)?.qty ?? 1;
  return {
    text: `Switched to ${to.name}${qty > 1 ? ` × ${qty}` : ''}: ${rupees((Number(to.price) || 0) * qty)}.`,
    actions: [{ type: 'remove', itemId: r.dish.id }, { type: 'add', itemId: to.id, qty }], cards: [to.id],
  };
}

export function pairReply(anchorName: string | null, tray: Tray, menu: MenuDish[], ctx: RecommendCtx, lastId: string | null): TurnReply {
  const named = anchorName ? resolveMention(anchorName, menu) : null;
  const byId = new Map(menu.map((d) => [d.id, d]));
  // The dish just added, then the tray's latest; mains first (a curry, not the naan beside it), each dish once.
  const recent = Array.from(new Set([lastId ? byId.get(lastId) : undefined, ...trayLines(tray, menu).map((l) => l.dish).reverse()]
    .filter((d): d is MenuDish => Boolean(d))));
  const mains = recent.filter((d) => facetsOf(d).kind === 'main');
  const anchors = named?.status === 'ok' ? [named.dish] : (mains.length ? mains : recent).slice(0, 2);
  if (!anchors.length) return { text: 'Tell me what you’re having and I’ll suggest what goes well with it.', chips: ["What's popular?"] };
  const picks = pairWith(anchors, menu, { ...ctx, trayIds: tray.map((l) => l.itemId) });
  if (!picks.length) return { text: `${anchors[0].name} is lovely on its own here. Anything else I can get you?`, chips: ["That's all", 'Show desserts'] };
  return { text: `With ${list(anchors.map((a) => a.name))}, guests here love:\n${rows(picks)}`, cards: picks.map((d) => d.id), chips: addChips(picks) };
}

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

export function eventsReply(events: VenueEvent[] | null): TurnReply {
  if (!events) return { text: 'I can’t see the events list just now. The Lounge tab shows everything that’s on.' };
  if (!events.length) return { text: 'Nothing is planned just now. Keep an eye on the Lounge tab for what’s coming up.', chips: ["What's popular?"] };
  const top = events.slice(0, 3).map((e) => `• ${e.title}, ${e.is_live_now ? 'on now' : when(e.starts_at)}${e.spots_left != null ? `, ${e.spots_left} spots left` : ''} · ${e.entry_fee > 0 ? rupees(e.entry_fee) : 'Free'}`);
  return { text: `Here’s what’s on:\n${top.join('\n')}\nSee details and save your spot in the Lounge tab.`, chips: ["What's popular?"] };
}

/** "spicy non-veg picks under ₹300", in the guest's own terms. */
function wishes(c: Constraints): string {
  const parts: string[] = [];
  if (c.spicy) parts.push('spicy'); else if (c.mild) parts.push('mild');
  if (c.light) parts.push('light');
  if (c.cold) parts.push('cold'); else if (c.hot) parts.push('hot');
  if (c.diet) parts.push(DIET_LABEL[c.diet].toLowerCase());
  if (c.ingredients.length) parts.push(c.ingredients.join(' and '));
  const label = c.concepts.length ? (CONCEPT_LABEL[c.concepts[0]] ?? c.concepts[0]) : 'picks';
  const kind = /s$/.test(label) ? label : `${label} picks`;
  const price = c.maxPrice ? ` under ${rupees(c.maxPrice)}` : c.minPrice ? ` above ${rupees(c.minPrice)}` : '';
  return `${parts.join(' ')} ${kind}${price}`.trim();
}

const RELAX: Record<string, string> = { light: 'light', hot: 'hot', cold: 'cold', mild: 'mild', spicy: 'spicy', ingredients: 'that ingredient', price: 'price' };

export function recommendReply(c: Constraints, menu: MenuDish[], ctx: RecommendCtx, popularAsk: boolean): TurnReply {
  const { dishes, relaxed } = recommend(menu, c, ctx);
  if (!dishes.length) {
    return { text: c.diet ? `I couldn’t find ${wishes(c)} on this menu. Would you like me to ask the staff?` : `I couldn’t find ${wishes(c)} on this menu right now.`, chips: ["What's popular?", 'Show drinks'] };
  }
  // "Guests are loving" is said only when there is enough ordering behind it to mean something.
  const counts = Object.values(ctx.popularity ?? {});
  const loved = counts.length >= 5 && counts.reduce((s, n) => s + n, 0) >= 20;
  const lead = popularAsk && !relaxed.length && !c.concepts.length && !c.diet
    ? (loved ? 'Here’s what guests here are loving right now:' : 'Here are a few I’d suggest:')
    : relaxed.length
      ? `I couldn’t find anything that is ${relaxed.map((r) => RELAX[r] ?? r).join(' and ')} as well, so here are the closest ${wishes({ ...c, ...Object.fromEntries(relaxed.map((r) => [r === 'price' ? 'maxPrice' : r, undefined])), ingredients: relaxed.includes('ingredients') ? [] : c.ingredients })}:`
      : `Here are some ${wishes(c)} for you:`;
  return { text: `${lead}\n${rows(dishes.slice(0, 4))}`, cards: dishes.map((d) => d.id), chips: addChips(dishes) };
}

// Turns what the guest wants into Vibey's reply: tray changes for dishes that resolved, a choice for the ones that did
// not, and an answer for questions. Every dish here came out of the resolver; nothing the model wrote is used as a dish.
import { kindOf } from '@/lib/guest/cart-suggestions';
import { resolveInTray, resolveMention } from './resolve';
import { SAME_AS_LAST, TIME } from './fastpath';
import { browse, describe, dietary, popular, price, WAIT_TIME, type Answer } from './answers';
import { isDietWord } from './diet';
import { dishTokens, normalise } from './text';
import type { MenuDish } from './retrieve';
import type { GuestAction, GuestRequest, Mention, Understood, VibeyGuestReply } from './schema';

export interface RespondInput {
  understood: Understood | null;
  req: Pick<GuestRequest, 'text' | 'tray'>;
  menu: MenuDish[];
  featured: string[];
  path: VibeyGuestReply['meta']['path'];
  ms: number;
  /** Part of the message could not be read without the model. */
  unread?: boolean;
}

const QUICK_MODE = 'I’m in quick mode right now, so short orders work best, like "2 cold coffee and a masala chai". You can also order straight from the menu.';
const THANKS = /\b(thanks?|thank|thx|shukriya|dhanyavaad|dhanyawad)\b/i;
// "Remove everything except the coffee" names the dish to keep, not the one to remove: never act on it.
const KEEP = /\b(except|other than|apart from|but not|keep|leave|chhod ?ke|chod ?ke|ke alawa|ke siwa|siwa)\b/i;
const TIME_NOTE = ' About timing: I don’t have the kitchen’s preparation times, so please check with the staff.';
const qtyName = (qty: number, name: string) => `${qty} × ${name}`;
const list = (parts: string[]) => (parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`);

function defaultChips(menu: MenuDish[], trayIds: string[]): string[] {
  const kinds = new Set(menu.filter((d) => trayIds.includes(d.id)).map((d) => kindOf(d)));
  const chips: string[] = [];
  if (trayIds.length && !kinds.has('beverage')) chips.push('Show drinks');
  if (trayIds.length && !kinds.has('dessert')) chips.push('Show desserts');
  if (!trayIds.length) chips.push("What's popular?", 'Show drinks');
  if (trayIds.length) chips.push("That's all");
  return chips.slice(0, 3);
}

/** The dish a mention points at, with "one more of the same" read as the last line of the tray. */
function target(m: Mention, intent: Understood['intent'], menu: MenuDish[], trayIds: string[]) {
  if (m.dish_words === SAME_AS_LAST) {
    const last = menu.find((d) => d.id === trayIds[trayIds.length - 1]);
    return last ? { status: 'ok' as const, dish: last, score: 1 } : { status: 'none' as const, nearest: [] as MenuDish[] };
  }
  return intent === 'add' ? resolveMention(m.dish_words, menu) : resolveInTray(m.dish_words, menu, trayIds);
}

function orderReply(u: Understood, menu: MenuDish[], trayIds: string[]) {
  const actions: GuestAction[] = [];
  const said: string[] = [];
  const cards: string[] = [];
  let chips: string[] | null = null;
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
        did('added', `${qtyName(qty, r.dish.name)}${m.note ? ` (${m.note})` : ''}`);
      }
    } else if (r.status === 'ambiguous') {
      said.push(`We have a few options for "${m.dish_words}". Which one would you like?`);
      r.options.forEach((d) => cards.push(d.id));
      chips ??= r.options.map((d) => `${u.intent === 'add' && (m.qty ?? 1) > 1 ? `${m.qty} ` : ''}${d.name}`.slice(0, 48));
    } else if (m.dish_words === SAME_AS_LAST) {
      said.push('Your tray is empty right now. What would you like to have?');
    } else {
      said.push(`Sorry, I couldn't find "${m.dish_words}" on today's menu.${r.nearest.length === 1 ? ' Here’s the closest match:' : r.nearest.length ? ' Here are the closest matches:' : ''}`);
      r.nearest.forEach((d) => cards.push(d.id));
    }
  }
  const parts = Object.entries(done).map(([verb, items]) => `${verb} ${list(items)}`);
  const lead = parts.length ? `Done! I've ${parts.join('; ')}${done.added ? ' to your tray' : ''}.` : '';
  return { text: [lead, ...said].filter(Boolean).join(' '), actions, cards, chips };
}

/** A reading whose "dishes" are only diet words ("add: non veg") is a wish to see those dishes, not a dish name. */
function dietOnly(u: Understood): Understood {
  if (!['add', 'ask'].includes(u.intent) || !u.mentions.length) return u;
  const words = u.mentions.flatMap((m) => dishTokens(m.dish_words));
  if (!words.length || !words.every(isDietWord)) return u;
  return { intent: 'browse', mentions: [], topic: normalise(u.mentions.map((m) => m.dish_words).join(' ')) };
}

export function respond({ understood, req, menu, featured, path, ms, unread }: RespondInput): VibeyGuestReply {
  const trayIds = req.tray.map((t) => t.itemId);
  const u = understood ? dietOnly(understood) : null;
  const timeNote = TIME.test(normalise(req.text)) && u?.question !== 'wait_time' ? TIME_NOTE : '';
  const out = (text: string, extra: { actions?: GuestAction[]; cards?: string[]; chips?: string[] } = {}): VibeyGuestReply => ({
    reply: (text + timeNote).slice(0, 600),
    actions: (extra.actions ?? []).slice(0, 10),
    cards: Array.from(new Set(extra.cards ?? [])).slice(0, 8).map((itemId) => ({ itemId })),
    chips: (extra.chips?.length ? extra.chips : defaultChips(menu, trayIds)).slice(0, 4),
    meta: { path, ms, intent: u?.intent ?? 'unknown' },
  });
  const answer = (a: Answer) => out(a.text, { cards: a.cards, chips: a.chips, actions: a.staff ? [{ type: 'call_staff', reason: a.staff }] : [] });

  if (!u) {
    return out(path === 'fallback' || unread ? QUICK_MODE : 'I can add dishes from this menu to your tray. Try "2 cold coffee", or ask "what\'s popular?"');
  }
  switch (u.intent) {
    case 'add': case 'remove': case 'set_qty': {
      if (u.intent === 'remove' && KEEP.test(req.text)) return out('I can only take out the dishes you name. Which ones should I remove?');
      if (!u.mentions.length) return out("Sorry, I couldn't tell which dish you meant. Could you name it as it appears on the menu?");
      const r = orderReply(u, menu, trayIds);
      const rest = unread ? ' I couldn’t quite catch the rest. Could you name those dishes as they appear on the menu?' : '';
      return out(r.text + rest, { actions: r.actions, cards: r.cards, chips: r.chips ?? undefined });
    }
    case 'checkout':
      return trayIds.length
        ? out('Lovely! Here’s your tray. Please check it and tap Place order when you’re ready.', { actions: [{ type: 'open_tray' }], chips: ["What's popular?"] })
        : out('Your tray is empty right now. What would you like to have?');
    case 'call_staff':
      return out('Of course! Tap below and I’ll let the staff know you need help.', { actions: [{ type: 'call_staff', reason: 'help' }] });
    case 'browse':
      return answer(browse(u.topic, menu));
    case 'ask':
      if (u.question === 'dietary') return answer(dietary(req.text, menu));
      if (u.question === 'wait_time') return answer(WAIT_TIME);
      return answer(u.question === 'popular' ? popular(menu, featured)
        : u.question === 'price' ? price(u.topic, menu)
        : u.question === 'describe' ? describe(u.topic, menu)
        : u.topic ? browse(u.topic, menu) : popular(menu, featured));
    case 'smalltalk':
    default:
      return out(THANKS.test(req.text)
        ? 'You’re most welcome! Is there anything else I can get you?'
        : 'Hello, and welcome! Tell me what you’d like and I’ll add it to your tray, for example "2 cold coffee and a masala chai".');
  }
}

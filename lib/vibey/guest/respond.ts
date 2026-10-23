// Turns what the guest wants into Vibey's reply: tray changes for dishes that resolved, a question for the ones that did
// not, suggestions for wishes, and answers to questions. Every dish here came out of the resolver or the recommender
// over this venue's menu; nothing the model wrote is used as a dish, a price or a fact.
import { rupees } from '@/lib/guest/cashback';
import { SAME_AS_LAST, TIME } from './fastpath';
import { browse, describe, dietary, price, WAIT_TIME, type Answer } from './answers';
import { isDietWord } from './diet';
import { dishTokens, normalise } from './text';
import { parseConstraints, hasLimits } from './constraints';
import { namedDish } from './named-dish';
import { orderReply } from './order-reply';
import { pairWith } from './pairing';
import { planTurn } from './plan-ask';
import { applyActions, traySummary } from './tray';
import { facetsOf, variantWord } from './facets';
import { clearTrayReply, eventsReply, pairReply, recommendReply, swapReply, trayTotalReply, type TurnReply, type VenueEvent } from './turn-replies';
import type { MenuDish } from './retrieve';
import type { GuestAction, GuestRequest, Understood, VibeyContext, VibeyGuestReply } from './schema';

export interface RespondInput {
  understood: Understood | null;
  req: Pick<GuestRequest, 'text' | 'tray'> & { context?: VibeyContext };
  menu: MenuDish[];
  featured: string[];
  path: VibeyGuestReply['meta']['path'];
  ms: number;
  /** Part of the message could not be read without the model. */
  unread?: boolean;
  /** Dishes ordered at this venue recently (item id -> quantity), for "what's popular". */
  popularity?: Record<string, number>;
  /** The venue's local hour (0-23), so breakfast is suggested in the morning. */
  hour?: number;
  /** The venue's events, read only when the guest asks about them (null: could not be read). */
  events?: VenueEvent[] | null;
  /** The language the guest writes in; remembered in the context so a tapped suggestion keeps it. */
  lang?: string;
}

const QUICK_MODE = 'I’m in quick mode right now, so short orders work best, like "2 cold coffee and a masala chai". You can also order straight from the menu.';
const THANKS = /\b(thanks?|thank|thx|shukriya|dhanyavaad|dhanyawad)\b/i;
// "Remove everything except the coffee" names the dish to keep, not the one to remove: never act on it.
const KEEP = /\b(except|other than|apart from|but not|keep|leave|chhod ?ke|chod ?ke|ke alawa|ke siwa|siwa)\b/i;
const TIME_NOTE = ' About timing: I don’t have the kitchen’s preparation times, so please check with the staff.';

const HELP = 'I’m Vibey, your host at the table. I can suggest dishes for your mood or budget, plan a meal for your table, tell you what goes well together, fill your tray and call the staff. Try one of these:';

function defaultChips(trayIds: string[]): string[] {
  return trayIds.length ? ['What goes well with it?', 'Show desserts', "That's all"] : ["What's popular?", 'Something sweet', 'Something spicy', 'Show drinks'];
}

/** "Show me more": new dishes of the kind just shown (drinks after drinks), never the ones already on screen. */
function moreOf(shownIds: string[], menu: MenuDish[]): MenuDish[] {
  const kinds = new Set(shownIds.map((id) => menu.find((d) => d.id === id)).filter((d): d is MenuDish => Boolean(d)).map((d) => facetsOf(d).kind));
  return kinds.size === 1 ? menu.filter((d) => kinds.has(facetsOf(d).kind)) : menu;
}

/** A reading whose "dishes" are only diet words ("add: non veg") is a wish to see those dishes, not a dish name. */
function dietOnly(u: Understood): Understood {
  if (!['add', 'ask'].includes(u.intent) || !u.mentions.length) return u;
  const words = u.mentions.flatMap((m) => dishTokens(m.dish_words));
  if (!words.length || !words.every(isDietWord)) return u;
  return { intent: 'browse', mentions: [], topic: normalise(u.mentions.map((m) => m.dish_words).join(' ')) };
}

export function respond({ understood, req, menu, featured, path, ms, unread, popularity, hour, events, lang }: RespondInput): VibeyGuestReply {
  const trayIds = req.tray.map((t) => t.itemId);
  const ctxIn = req.context;
  const rec = { featured, popularity, hour, trayIds };
  const u = understood ? dietOnly(understood) : null;
  const timeNote = TIME.test(normalise(req.text)) && u?.question !== 'wait_time' ? TIME_NOTE : '';
  const out = (text: string, extra: { actions?: GuestAction[]; cards?: string[]; chips?: string[]; pending?: VibeyContext['pending']; last?: string | null; plan?: VibeyContext['plan']; planAsk?: VibeyContext['planAsk'] } = {}): VibeyGuestReply => {
    const cards = Array.from(new Set(extra.cards ?? [])).slice(0, 8);
    const last = extra.last !== undefined ? extra.last : ctxIn?.last ?? null;
    // The suggestions follow the tray as this reply leaves it (a dish just added counts).
    const trayAfter = (extra.actions ?? []).some((a) => a.type === 'add') ? [...trayIds, 'added'] : trayIds;
    return {
      reply: (text + timeNote).slice(0, 600),
      actions: (extra.actions ?? []).slice(0, 10),
      cards: cards.map((itemId) => ({ itemId })),
      chips: (extra.chips?.length ? extra.chips : defaultChips(trayAfter)).slice(0, 4),
      meta: {
        path, ms, intent: u?.intent ?? 'unknown',
        context: {
          shown: cards, pending: extra.pending ?? null, last, ...(extra.plan?.length ? { plan: extra.plan } : {}),
          ...(extra.planAsk ? { planAsk: extra.planAsk } : {}), ...(lang && lang !== 'en' ? { lang } : {}),
        },
      },
    };
  };
  const answer = (a: Answer) => out(a.text, { cards: a.cards, chips: a.chips, actions: a.staff ? [{ type: 'call_staff', reason: a.staff }] : [] });
  const turn = (r: TurnReply) => {
    const after = r.actions?.some((a) => a.type !== 'open_tray' && a.type !== 'call_staff') ? applyActions(req.tray, r.actions ?? []) : null;
    const summary = after ? `${r.text.includes('\n') ? '\n' : ' '}${traySummary(after, menu)}` : '';
    const lastAdd = r.actions?.filter((a) => a.type === 'add').at(-1);
    return out(`${r.text}${summary}`.trim(), { actions: r.actions, cards: r.cards, chips: r.chips, last: lastAdd && 'itemId' in lastAdd ? lastAdd.itemId : undefined });
  };

  if (!u) return out(path === 'fallback' || unread ? QUICK_MODE : 'I can add dishes from this menu to your tray, suggest something, or tell you what goes well together. Try "2 cold coffee" or "something spicy under 300".');
  switch (u.intent) {
    case 'add': case 'remove': case 'set_qty': {
      if (u.intent === 'remove' && KEEP.test(req.text)) return out('I can only take out the dishes you name. Which ones should I remove?');
      if (!u.mentions.length) return out("Sorry, I couldn't tell which dish you meant. Could you name it as it appears on the menu?");
      const r = orderReply(u, menu, trayIds);
      const rest = unread ? ' I couldn’t quite catch the rest. Could you name those dishes as they appear on the menu?' : '';
      const changed = r.actions.length ? ` ${traySummary(applyActions(req.tray, r.actions), menu)}` : '';
      // After an add, one suggestion of what goes with it (never a dish already in the tray); a whole spread needs none.
      const pairs = r.added.length && r.added.length <= 2 ? pairWith(r.added, menu, { ...rec, trayIds: [...trayIds, ...r.added.map((d) => d.id)] }, 2) : [];
      const chips = r.chips ?? (pairs.length ? [...pairs.map((d) => `Add ${d.name}`.slice(0, 48)), "That's all"] : undefined);
      const nudge = pairs.length && !r.chips ? ` ${pairs[0].name} (${rupees(Number(pairs[0].price) || 0)}) goes well with it.` : '';
      return out(`${r.text}${rest}${changed}${nudge}`.replace(/\s+/g, ' ').trim(), { actions: r.actions, cards: r.cards, chips, pending: r.pending, last: r.added.at(-1)?.id ?? (u.mentions[0]?.dish_words === SAME_AS_LAST ? ctxIn?.last : undefined) });
    }
    case 'checkout':
      return trayIds.length
        ? out(`Lovely! ${traySummary(req.tray, menu)} Please check it and tap Place order when you’re ready.`, { actions: [{ type: 'open_tray' }], chips: ['What goes well with it?'] })
        : out('Your tray is empty right now. What would you like to have?');
    case 'call_staff':
      return u.topic === 'bill'
        ? out('Of course! Tap below and I’ll let the staff know you’d like the bill.', { actions: [{ type: 'call_staff', reason: 'bill' }] })
        : out('Of course! Tap below and I’ll let the staff know you need help.', { actions: [{ type: 'call_staff', reason: 'help' }] });
    case 'plan': {
      // Asked like a waiter: veg or non-veg, then the craving, then the spread (see plan-ask.ts).
      const answer = u.topic === 'answer';
      const r = planTurn({ text: req.text, people: answer ? null : Number(u.topic) || 2, ask: answer ? ctxIn?.planAsk ?? null : null, menu, ctx: rec });
      return out(r.text, { cards: r.cards, chips: r.chips, plan: r.plan, planAsk: r.planAsk });
    }
    case 'tray_total': return turn(trayTotalReply(req.tray, menu));
    case 'clear_tray': return turn(clearTrayReply(req.tray, menu));
    case 'swap': return turn(swapReply(u.mentions[0]?.dish_words ?? '', variantWord(req.text), req.tray, menu));
    case 'pair': return turn(pairReply(u.mentions[0]?.dish_words ?? null, req.tray, menu, rec, ctxIn?.last ?? null));
    case 'events': return turn(eventsReply(events ?? null));
    case 'recommend':
      if (u.topic === 'more') return turn(recommendReply({ concepts: [], ingredients: [] }, moreOf(ctxIn?.shown ?? [], menu), { ...rec, trayIds: [...trayIds, ...(ctxIn?.shown ?? [])] }, true));
      return turn(recommendReply(parseConstraints(req.text, menu), menu, rec, true));
    case 'browse': {
      // "do you have margherita pizza": a dish asked for by name gets a straight yes.
      const named = namedDish(u.topic ?? '', menu);
      if (named) return out(`Yes! ${named.name} is ${rupees(Number(named.price) || 0)}. Shall I add it?`, { cards: [named.id], chips: [`Add ${named.name}`.slice(0, 48), 'What goes well with it?'] });
      const c = parseConstraints(req.text, menu);
      if (hasLimits(c)) return turn(recommendReply(c, menu, rec, false));
      return answer(browse(u.topic, menu));
    }
    case 'ask':
      if (u.question === 'dietary') return answer(dietary(req.text, menu));
      if (u.question === 'wait_time') return answer(WAIT_TIME);
      if (u.question === 'price') return answer(price(u.topic, menu));
      if (u.question === 'describe') return answer(describe(u.topic, menu));
      if (u.question === 'popular' || !u.topic) return turn(recommendReply(parseConstraints(req.text, menu), menu, rec, true));
      return answer(browse(u.topic, menu));
    case 'smalltalk':
    default:
      if (u.topic === 'help') return out(HELP, { chips: ["What's popular?", 'Kuch thanda chalega?', 'Something spicy under 300', 'Show desserts'] });
      return out(THANKS.test(req.text)
        ? 'You’re most welcome! Is there anything else I can get you?'
        : 'Hello, and welcome! I can suggest dishes, add them to your tray and tell you what goes well together. What are you in the mood for?');
  }
}

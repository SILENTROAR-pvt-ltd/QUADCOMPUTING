// More of what guests say that is not an order: a meal for the table ("dinner for 4", "hum 3 log hain"), "I'm hungry" or
// "surprise me", "show me more", the bill, and "what can you do?". Each becomes a reading with no dish words of its own,
// except "add the whole spread", which adds the dishes Vibey itself planned (by menu name, checked again on the menu).
import { dishTokens, NUMBER_WORDS } from './text';
import { resolveMention } from './resolve';
import type { MenuDish } from './retrieve';
import type { Understood, VibeyContext } from './schema';

const N = `(\\d{1,2}|${Object.keys(NUMBER_WORDS).filter((w) => !['a', 'an'].includes(w)).join('|')})`;
const GROUP = new RegExp([
  `\\b(?:we are|we re|were|hum|ham|there are|table of|table for|party of|family of|group of)\\s+${N}\\b`,
  `\\b${N}\\s+(?:people|persons|person|pax|guests|of us|log|logon|logo|members|adults|friends)\\b`,
  `\\b(?:meal|dinner|lunch|breakfast|food|spread|khana|plan|combo|order)\\s+(?:for|ke liye)\\s+${N}\\b`,
].join('|'));
const COUPLE = /\b(for (a |the )?couple|date night|for two|for us two|hum dono|we both)\b/;
const HELP = /\b(what can you do|what do you do|who are you|what are you|how (does|do) (this|it|you) work|how (to|do i|can i) order|kaise order|help me order|aap kya kar sakte|tum kya kar sakte|kya kya kar sakte)\b/;
const BILL = /^(the |get (me |us )?the |can (i|we) (get|have) the )?(bill|check|cheque)( please| plz| lao| la do| de do| dedo| chahiye)?$|\b(bill (lao|la do|de do|dedo|chahiye|please|plz|bhejo|mangwa do|kar do)|ask for the bill|pay the bill|settle the bill)\b/;
const HUNGRY = /\b(i m hungry|im hungry|i am hungry|so hungry|starving|bhook lagi|bhukh lagi|bhook lag|bhukh lag|kuch khila|feed me|surprise me|chef s choice|chefs choice|you choose|you decide|aap batao|tum batao|aap hi batao|aap decide|dealer s choice|your pick|your choice)\b/;
const MORE = /\b(show more|more options|any more|aur dikhao|aur batao|kuch aur dikhao|something else|other options|anything else like|different ones?|aur options)\b/;
const ADD_PLAN = /\b(whole spread|the spread|full spread|add (it )?all|add them all|all of (it|them)|add everything|sab add|sab daal|sab dal|sab kuch add|add the plan|go ahead|sounds good|perfect|yes|yeah|haan|ha|ok|okay|sure|done)\b/;

const peopleIn = (t: string): number | null => {
  const m = GROUP.exec(t);
  const word = m?.slice(1).find(Boolean);
  if (word) return /^\d+$/.test(word) ? Number(word) : NUMBER_WORDS[word] ?? null;
  return COUPLE.test(t) ? 2 : null;
};

export function moodParse(t: string, menu: MenuDish[], ctx: VibeyContext): Understood | null {
  const plan = (ctx.plan ?? []).map((p) => ({ dish: menu.find((d) => d.id === p.id), qty: p.qty })).filter((p) => p.dish);
  if (plan.length && ADD_PLAN.test(t) && !/\b(no|not|nahi|nahin|don t)\b/.test(t)) {
    return { intent: 'add', mentions: plan.map((p) => ({ dish_words: p.dish!.name, qty: p.qty, note: null })) };
  }
  if (HELP.test(t)) return { intent: 'smalltalk', topic: 'help', mentions: [] };
  if (BILL.test(t)) return { intent: 'call_staff', topic: 'bill', mentions: [] };
  const people = peopleIn(t);
  // "butter chicken for 2 people" orders a dish; only a table with no dish named gets a spread.
  const rest = t.replace(GROUP, ' ').replace(COUPLE, ' ').replace(/\b(add|order|get|give|suggest|plan|please|plz|something|kuch)\b/g, ' ');
  const namesDish = dishTokens(rest).length > 0 && resolveMention(rest, menu).status === 'ok';
  if (people && people >= 1 && people <= 20 && !namesDish) return { intent: 'plan', topic: String(people), mentions: [] };
  if (HUNGRY.test(t)) return { intent: 'recommend', mentions: [] };
  if (MORE.test(t) && ctx.shown.length) return { intent: 'recommend', topic: 'more', mentions: [] };
  return null;
}

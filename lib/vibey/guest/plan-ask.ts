// A table's meal, asked the way a waiter would before suggesting anything: veg or non-veg (only when the menu has both),
// then what they are craving (this venue's own kinds of mains, most ordered first), then the spread. A question the
// guest already answered in their first words ("veg dinner for 4", "pizza for 2") is skipped.
import { facetsOf, isAddOn } from './facets';
import { isStarter } from './pairing';
import { dishTokens, normalise } from './text';
import { parseConstraints } from './constraints';
import { isDietWord } from './diet';
import { planFor, planText } from './plan';
import type { RecommendCtx } from './recommend';
import type { MenuDish } from './retrieve';
import type { PlanAsk, VibeyContext } from './schema';

export interface PlanTurn { text: string; chips: string[]; cards: string[]; plan: VibeyContext['plan']; planAsk: PlanAsk | null }
type Diet = PlanAsk['diet'];

const VEG = /^(pure )?(veg|vegetarian|veggie|shakahari|only veg|veg only)( please| only| food| hi)?$/;
const NON_VEG = /\b(non ?veg|nonveg|non vegetarian|chicken|mutton|meat|fish|egg|prawns?)\b/;
const ANY = /\b(both|mix|mixed|any|anything|kuch bhi|dono|doesn t matter|no preference|either)\b/;
const YOU_CHOOSE = /\b(you choose|your choice|surprise me|anything|kuch bhi|aap batao|aap hi batao|chef s choice|chefs choice|whatever|you decide|up to you|any)\b/;
const MEAL = /\b(breakfast|brunch|lunch|dinner|supper|meal)\b/;

const markOf = (d: MenuDish) => facetsOf(d).diet;
const isMeat = (d: MenuDish) => markOf(d) === 'non_veg' || markOf(d) === 'egg';
const fits = (d: MenuDish, diet: Diet) => (diet === 'veg' ? !isMeat(d) && markOf(d) !== null : diet === 'non_veg' ? isMeat(d) : true);
const mainsOf = (menu: MenuDish[]) => menu.filter((d) => facetsOf(d).kind === 'main' && !isStarter(d) && !facetsOf(d).concepts.has('breakfast') && !isAddOn(d) && Number(d.price) > 0);
/** "INDIAN MAIN COURSE" reads as "Indian Main Course" on a button. */
const pretty = (s: string) => (s === s.toUpperCase() ? s.toLowerCase().replace(/\b[a-z]/g, (m) => m.toUpperCase()) : s).trim();
/** Words that say who is eating or whether it is veg, never what kind of food ("non veg dinner for 2"). */
const NOT_A_CRAVING = new Set(['dinner', 'lunch', 'breakfast', 'brunch', 'supper', 'meal', 'people', 'log', 'hain', 'hum', 'table', 'tonight', 'today']);
const cravingWords = (s: string) => dishTokens(s).filter((w) => !isDietWord(w) && !NOT_A_CRAVING.has(w));

/** Every kind of main this menu has for that diet, most dishes (and most ordered) first. */
export function styles(menu: MenuDish[], diet: Diet, popularity: Record<string, number> = {}): string[] {
  const score = new Map<string, number>();
  for (const d of mainsOf(menu).filter((x) => fits(x, diet))) {
    // A section named only for its diet ("Non Veg") says nothing about what kind of food it is.
    const k = pretty(d.category ?? '');
    if (k && cravingWords(k).length) score.set(k, (score.get(k) ?? 0) + 1 + 3 * (popularity[d.id] ?? 0));
  }
  return Array.from(score.entries()).sort((a, b) => b[1] - a[1]).map(([k]) => k);
}

/** The kind of food named in the guest's words, if it is one of this menu's ("chinese" -> "Chinese Main Course"). */
function styleIn(t: string, options: string[]): string | null {
  const said = new Set(cravingWords(t));
  if (!said.size) return null;
  const named = options.map((o) => ({ o, words: cravingWords(o) })).filter((x) => x.words.length);
  return named.find((x) => x.words.every((w) => said.has(w)))?.o
    ?? named.find((x) => x.words.some((w) => said.has(w)))?.o ?? null;
}

function dietIn(t: string): Diet | undefined {
  if (VEG.test(t)) return 'veg';
  if (NON_VEG.test(t)) return 'non_veg';
  if (ANY.test(t)) return 'any';
  return undefined;
}

/** True when the guest's words answer the question Vibey asked about their table's meal. */
export function isPlanAnswer(text: string, ask: PlanAsk, menu: MenuDish[]): boolean {
  const t = normalise(text);
  if (ask.step === 'diet') return dietIn(t) !== undefined;
  return YOU_CHOOSE.test(t) || styleIn(t, styles(menu, ask.diet)) !== null;
}

export function planTurn(input: { text: string; people: number | null; ask: PlanAsk | null; menu: MenuDish[]; ctx: RecommendCtx }): PlanTurn {
  const { text, ask, menu, ctx } = input;
  const t = normalise(text);
  const c = parseConstraints(text, menu);
  const people = ask?.people ?? Math.max(1, Math.min(input.people ?? 2, 12));
  const max = ask?.max ?? c.maxPrice ?? null;
  const hasBoth = menu.some(isMeat) && mainsOf(menu).some((d) => fits(d, 'veg'));
  let diet: Diet = ask?.diet ?? (c.diet ? (c.diet === 'veg' || c.diet === 'vegan' ? 'veg' : 'non_veg') : null);
  if (ask?.step === 'diet') diet = dietIn(t) ?? 'any';
  if (!diet && !hasBoth) diet = 'any';

  // The greeting for the table, in the guest's terms: "Dinner for 4, lovely.", "Veg dinner for 2, lovely."
  const greet = (d: Diet) => {
    const meal = MEAL.exec(t)?.[1];
    const n = people === 1 ? 'one' : String(people);
    const kind = d === 'veg' ? 'veg' : d === 'non_veg' ? 'non-veg' : '';
    const words = meal ? `${kind ? `${kind} ` : ''}${meal} for ${n}` : `a table for ${n}${kind ? `, ${kind === 'veg' ? 'all veg' : kind}` : ''}`;
    return `${words[0].toUpperCase()}${words.slice(1)}, lovely.`;
  };
  if (!diet) {
    return { text: `${greet(null)} Veg or non-veg?`, chips: ['Veg', 'Non-veg', 'Both'], cards: [], plan: null, planAsk: { people, step: 'diet', diet: null, max } };
  }
  const options = styles(menu, diet, ctx.popularity);
  const style = ask?.step === 'style' && YOU_CHOOSE.test(t) ? null : styleIn(t, options);
  if (!style && ask?.step !== 'style' && options.length >= 2) {
    // Just answered "veg or non-veg?": acknowledge it; first message: greet the table (with the diet they gave, if any).
    const lead = ask?.step === 'diet'
      ? (diet === 'veg' ? 'Noted, all veg.' : diet === 'non_veg' ? 'Noted, non-veg.' : 'Noted.')
      : greet(hasBoth ? diet : null);
    return { text: `${lead} Any cravings?`, chips: [...options.slice(0, 3), 'You choose'], cards: [], plan: null, planAsk: { people, step: 'style', diet, max } };
  }
  const lines = planFor(people, { ...c, concepts: [], ingredients: [], diet: diet === 'any' ? undefined : diet, maxPrice: max ?? undefined }, menu, ctx, style);
  return {
    text: planText(people, lines, max ?? undefined),
    chips: lines.length ? ['Add the whole spread', 'Show desserts', "What's popular?"] : ["What's popular?"],
    cards: lines.map((l) => l.dish.id),
    plan: lines.map((l) => ({ id: l.dish.id, qty: l.qty })),
    planAsk: null,
  };
}

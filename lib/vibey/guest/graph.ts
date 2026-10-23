// The guest agent as a LangGraph state graph: retrieve -> fastpath -> (understand, only when needed) -> respond.
// The neural layer reads; the deterministic layer decides: the model only says what the guest means, in words, and the
// rules, resolver and recommender turn that into dishes from this venue's menu. The route has already checked the venue,
// table, flags and rate limits. The model step is injected, so the graph runs the same in tests (with a fake model) and in
// production (with the real one), and degrades to rules when it fails.
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { fastParse, SAME_AS_LAST } from './fastpath';
import { dialogueParse } from './dialogue';
import { resolveMention } from './resolve';
import { candidatesFor, rankDishes, type MenuDish } from './retrieve';
import { buildPrompt, groundUnderstood, understoodSchema, type Turn } from './understand';
import { respond } from './respond';
import { replyLang } from './language';
import { localiseReply, type Translate } from './localise';
import type { VenueEvent } from './turn-replies';
import type { GuestRequest, Understood, VibeyGuestReply } from './schema';
import type { LlmUsage } from '../core/llm';

export interface GuestGraphDeps {
  /** One structured model call. Throws an LlmError on any failure. */
  understand: (prompt: { system: string; user: string }, schema: typeof understoodSchema) => Promise<{ data: Understood; usage: LlmUsage }>;
  /** Spends one call from the venue's daily budget; false when the model must not be used. */
  reserveModel: (businessId: string) => Promise<boolean>;
  /** The venue's events, read only when a guest asks about them. */
  loadEvents?: (businessId: string) => Promise<VenueEvent[]>;
  /** Translates a finished reply for a guest who writes in another language (one model call, same daily budget). */
  translate?: Translate;
}

const State = Annotation.Root({
  businessId: Annotation<string>,
  req: Annotation<GuestRequest>,
  menu: Annotation<MenuDish[]>,
  featured: Annotation<string[]>,
  popularity: Annotation<Record<string, number> | undefined>,
  hour: Annotation<number | undefined>,
  started: Annotation<number>,
  candidates: Annotation<MenuDish[]>,
  understood: Annotation<Understood | null>,
  needsModel: Annotation<boolean>,
  path: Annotation<VibeyGuestReply['meta']['path']>,
  usage: Annotation<LlmUsage | null>,
  errorCode: Annotation<string | null>,
  unread: Annotation<boolean>,
  reply: Annotation<VibeyGuestReply | null>,
  /** The language to answer in (ISO 639-1). */
  lang: Annotation<string>,
});
type S = typeof State.State;

const ORDER_INTENTS = ['add', 'remove', 'set_qty'];

/** True when a phrase has words the menu cannot place: the rules found no dish, or a choice that ignores some words. */
function unplaced(phrase: string, menu: MenuDish[]): boolean {
  if (phrase === SAME_AS_LAST) return false;
  const status = resolveMention(phrase, menu).status;
  if (status === 'ok') return false;
  const top = rankDishes(phrase, menu, 1)[0];
  return status === 'none' || !top || top.mentionCover < 0.85;
}

/** A parse needs the model when the rules could not read the message, or left words in it they could not place. */
function needsModel(u: Understood | null, menu: MenuDish[]): boolean {
  if (!u) return true;
  return ORDER_INTENTS.includes(u.intent) && u.mentions.some((m) => unplaced(m.dish_words, menu));
}

/** Without the model, the rules' reading minus the phrases they could not place (null if nothing is left). */
function rulesOnly(u: Understood | null, menu: MenuDish[]): { understood: Understood | null; unread: boolean } {
  if (!u || !ORDER_INTENTS.includes(u.intent)) return { understood: u, unread: !u };
  const mentions = u.mentions.filter((m) => !unplaced(m.dish_words, menu));
  return { understood: mentions.length ? { ...u, mentions } : null, unread: mentions.length < u.mentions.length };
}

export function buildGuestGraph(deps: GuestGraphDeps) {
  return new StateGraph(State)
    .addNode('retrieve', (s: S) => ({ candidates: candidatesFor(s.req.text, s.menu, 20) }))
    .addNode('fastpath', (s: S) => {
      // The conversation rules first (totals, pairings, "make it half", "the second one"), then the order parser.
      const understood = dialogueParse(s.req.text, s.menu, s.req.tray, s.req.context) ?? fastParse(s.req.text, s.menu);
      return { understood, needsModel: needsModel(understood, s.menu), path: 'fastpath' as const };
    })
    .addNode('understand', async (s: S) => {
      try {
        if (!(await deps.reserveModel(s.businessId))) return { ...rulesOnly(s.understood, s.menu), path: 'fallback' as const, errorCode: 'budget' };
        const history: Turn[] = s.req.history ?? [];
        const { data, usage } = await deps.understand(buildPrompt(s.req.text, history, s.candidates), understoodSchema);
        const grounded = groundUnderstood(data, s.req.text, history);
        // A model reading that grounds to nothing is no better than the rule parser's.
        const useful = grounded.intent !== 'add' || grounded.mentions.length > 0 || !s.understood;
        return { understood: useful ? grounded : s.understood, usage, path: 'model' as const };
      } catch (err: any) {
        return { ...rulesOnly(s.understood, s.menu), path: 'fallback' as const, errorCode: String(err?.code || 'model_error') };
      }
    })
    .addNode('respond', async (s: S) => {
      const events = s.understood?.intent === 'events' && deps.loadEvents
        ? await deps.loadEvents(s.businessId).catch(() => null)
        : null;
      return {
        reply: respond({
          understood: s.understood, req: s.req, menu: s.menu, featured: s.featured, path: s.path, ms: Date.now() - s.started,
          unread: s.unread, popularity: s.popularity, hour: s.hour, events, lang: s.lang,
        }),
      };
    })
    .addNode('translate', async (s: S) => {
      if (!deps.translate || !s.reply || !(await deps.reserveModel(s.businessId).catch(() => false))) return {};
      const out = await localiseReply(s.reply, s.lang, s.menu, deps.translate);
      return { reply: out.reply, usage: addUsage(s.usage, out.usage) };
    })
    .addEdge(START, 'retrieve')
    .addEdge('retrieve', 'fastpath')
    .addConditionalEdges('fastpath', (s: S) => (s.needsModel ? 'understand' : 'respond'), ['understand', 'respond'])
    .addEdge('understand', 'respond')
    // Only a guest writing in another language waits for a translation.
    .addConditionalEdges('respond', (s: S) => (s.lang !== 'en' && deps.translate ? 'translate' : END), ['translate', END])
    .addEdge('translate', END)
    .compile();
}

export type GuestGraph = ReturnType<typeof buildGuestGraph>;

export interface GuestTurnResult { reply: VibeyGuestReply; usage: LlmUsage | null; errorCode: string | null }

type TurnInput = { businessId: string; req: GuestRequest; menu: MenuDish[]; featured: string[]; popularity?: Record<string, number>; hour?: number };
const initial = (input: TurnInput) => ({
  ...input, started: Date.now(), candidates: [], understood: null, needsModel: false, path: 'fastpath' as const, usage: null, errorCode: null, unread: false, reply: null,
  lang: replyLang(input.req),
});

/** Two model calls in one turn (reading, then translating) are logged as one. */
function addUsage(a: LlmUsage | null, b: LlmUsage | null): LlmUsage | null {
  if (!a || !b) return a ?? b;
  return { model: a.model, ms: a.ms + b.ms, tokensIn: a.tokensIn + b.tokensIn, tokensOut: a.tokensOut + b.tokensOut };
}

/** Runs one guest message through the graph. */
export async function runGuestTurn(graph: GuestGraph, input: TurnInput): Promise<GuestTurnResult> {
  const s = await graph.invoke(initial(input));
  return { reply: s.reply!, usage: s.usage ?? null, errorCode: s.errorCode ?? null };
}

/** The graph's steps, as the guest sees them while Vibey works. */
export type GuestStep = 'retrieve' | 'fastpath' | 'understand' | 'respond' | 'translate';

/** Same as runGuestTurn, reporting each step the moment it finishes (for the live progress in the chat). */
export async function runGuestTurnStream(graph: GuestGraph, input: TurnInput, onStep: (step: GuestStep) => void): Promise<GuestTurnResult> {
  const state: Record<string, any> = initial(input);
  for await (const chunk of await graph.stream(state as any, { streamMode: 'updates' })) {
    for (const [node, update] of Object.entries(chunk as Record<string, any>)) {
      Object.assign(state, update);
      onStep(node as GuestStep);
    }
  }
  return { reply: state.reply, usage: state.usage ?? null, errorCode: state.errorCode ?? null };
}

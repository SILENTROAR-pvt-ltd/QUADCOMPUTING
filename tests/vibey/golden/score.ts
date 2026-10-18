// Loads the golden set and scores a Vibey reply against one case. Shared by the offline CI test and the live eval.
import fs from 'node:fs';
import path from 'node:path';
import { byName, DEMO_MENU } from '../fixtures/demo-menu';
import type { VibeyGuestReply } from '@/lib/vibey/guest/schema';

export interface GoldenCase {
  id: string;
  text: string;
  tray?: string[];
  history?: Array<{ role: 'guest' | 'vibey'; text: string }>;
  intent: string;
  alt?: string[];
  anyIntent?: boolean;
  adds?: Array<[string, number, string?]>;
  allow?: string[];
  removes?: string[];
  sets?: Array<[string, number]>;
  clarify?: boolean;
  none?: boolean;
  handoff?: 'dietary' | 'help' | 'other';
  /** Every dish card must be one of these, and there must be at least one (diet answers decided by the menu). */
  cardsOnly?: string[];
  /** No dish card may be one of these. */
  cardsExclude?: string[];
  rules?: boolean;
  loose?: boolean;
}

export function loadGolden(file = 'guest.jsonl'): GoldenCase[] {
  const raw = fs.readFileSync(path.join(__dirname, file), 'utf8');
  return raw.split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l));
}

export const trayOf = (c: GoldenCase) => (c.tray ?? []).map((n) => ({ itemId: byName(n).id, qty: 1 }));
const nameOf = (id: string) => DEMO_MENU.find((d) => d.id === id)?.name ?? `<unknown ${id}>`;

export interface CaseScore {
  id: string;
  intentOk: boolean;
  exact: boolean;
  /** Dishes added that the guest did not ask for: the hard gate, must always be 0. */
  wrongAdds: string[];
  wrongEdits: string[];
  problems: string[];
}

export function scoreCase(c: GoldenCase, reply: VibeyGuestReply): CaseScore {
  const problems: string[] = [];
  const addActs = reply.actions.filter((a) => a.type === 'add') as Array<{ itemId: string; qty: number; note?: string }>;
  const allowed = new Set([...(c.adds ?? []).map((a) => a[0]), ...(c.allow ?? [])]);
  const wrongAdds = addActs.map((a) => nameOf(a.itemId)).filter((n) => !allowed.has(n));
  const edits = reply.actions.filter((a) => a.type === 'remove' || a.type === 'set_qty') as Array<{ type: string; itemId: string; qty?: number }>;
  const okEdits = new Set([...(c.removes ?? []).map((n) => `remove:${n}`), ...(c.sets ?? []).map(([n]) => `set_qty:${n}`)]);
  const wrongEdits = c.loose && !c.removes && !c.sets ? [] : edits.map((e) => `${e.type}:${nameOf(e.itemId)}`).filter((k) => !okEdits.has(k));

  const intentOk = Boolean(c.anyIntent) || reply.meta.intent === c.intent || Boolean(c.alt?.includes(reply.meta.intent));
  if (!intentOk) problems.push(`intent ${reply.meta.intent} (want ${c.intent})`);
  if (wrongAdds.length) problems.push(`WRONG ADD ${wrongAdds.join(', ')}`);
  if (wrongEdits.length) problems.push(`WRONG EDIT ${wrongEdits.join(', ')}`);

  if (!c.allow && !c.loose) {
    const want = (c.adds ?? []).map(([n, q]) => `${n}×${q}`).sort().join(' | ');
    const got = addActs.map((a) => `${nameOf(a.itemId)}×${a.qty}`).sort().join(' | ');
    if (want !== got) problems.push(`adds [${got}] want [${want}]`);
    for (const [n, , note] of c.adds ?? []) {
      if (note && !addActs.find((a) => nameOf(a.itemId) === n)?.note) problems.push(`missing note on ${n}`);
    }
    for (const n of c.removes ?? []) if (!edits.find((e) => e.type === 'remove' && nameOf(e.itemId) === n)) problems.push(`missing remove ${n}`);
    for (const [n, q] of c.sets ?? []) if (!edits.find((e) => e.type === 'set_qty' && nameOf(e.itemId) === n && e.qty === q)) problems.push(`missing set ${n}=${q}`);
  }
  if (c.clarify && !(reply.cards.length > 0 && reply.chips.length > 0)) problems.push('expected a choice');
  if (c.handoff && !reply.actions.some((a) => a.type === 'call_staff' && a.reason === c.handoff)) problems.push(`expected call_staff ${c.handoff}`);
  if (c.none && addActs.length) problems.push('expected nothing added');
  const cardNames = reply.cards.map((x) => nameOf(x.itemId));
  if (c.cardsOnly && (!cardNames.length || cardNames.some((n) => !c.cardsOnly!.includes(n)))) problems.push(`WRONG CARDS [${cardNames.join(', ')}]`);
  if (c.cardsExclude && cardNames.some((n) => c.cardsExclude!.includes(n))) problems.push(`WRONG CARDS [${cardNames.join(', ')}]`);
  return { id: c.id, intentOk, exact: problems.length === 0, wrongAdds, wrongEdits, problems };
}

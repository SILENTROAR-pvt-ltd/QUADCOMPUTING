// Builds the co-pilot's reply: the tools' cards as they are, a one-line summary whose numbers must all come from the
// tools (the number verifier), a note for anything locked or failed, and next questions that fit the open tab.
import { rupees } from '@/lib/guest/cashback';
import { TOOLS, type ToolResult } from './tools';
import { verifiedOr } from './verify-numbers';
import { chipsFor } from './chips';
import type { HostCard, ToolCall, VibeyHostReply } from './schema';

export const HELP_TEXT = 'I can answer about sales, profit, top dishes, stock, dues, a bill (say its ORD number), live tables, deliveries, reservations and guests.';

export { chipsFor };

/** A plain sentence from the first tool's own figures. Every number in it is checked against the tool output. */
function summary(results: Array<{ call: ToolCall; result: ToolResult | null }>): string {
  const first = results.find((r) => r.result?.facts);
  const f = first?.result?.facts;
  if (!first || !f) return '';
  let s = '';
  if (first.call.name === 'sales_summary' && f.net_sales != null) {
    s = `Net sales ${rupees(f.net_sales)} from ${f.bills} settled ${f.bills === 1 ? 'bill' : 'bills'}${f.growth != null ? `, ${f.growth > 0 ? 'up' : 'down'} ${Math.abs(f.growth)}% on the previous period` : ''}.`;
  } else if (first.call.name === 'profit_and_loss' && f.net_profit != null) {
    s = `Net profit ${rupees(f.net_profit)} on revenue of ${rupees(f.revenue ?? 0)}.`;
  } else if (first.call.name === 'dues' && f.due != null) {
    s = f.due > 0 ? `${rupees(f.due)} in platform fees is due.` : 'No platform fees are due.';
  } else if (first.call.name === 'live_tables' && f.occupied != null) {
    s = `${f.occupied} ${f.occupied === 1 ? 'table is' : 'tables are'} occupied right now.`;
  }
  return verifiedOr(s, results.map((r) => r.result), '');
}

export function compose(input: {
  results: Array<{ call: ToolCall; result: ToolResult | null; error: string | null }>;
  blocked: ToolCall[];
  tab?: string;
  path: VibeyHostReply['meta']['path'];
  ms: number;
}): VibeyHostReply {
  const cards: HostCard[] = input.results.flatMap((r) => r.result?.cards ?? []);
  for (const r of input.results) {
    if (r.error) cards.push({ kind: 'note', title: `Couldn't read ${TOOLS[r.call.name].label}`, text: r.error === 'timeout' ? 'That took too long. Try again in a moment, or open the tab.' : 'Something went wrong reading that. Try again, or open the tab.' });
  }
  if (input.blocked.length) {
    cards.push({ kind: 'note', title: 'Locked', text: `Unlock with your master PIN to ask about ${input.blocked.map((c) => TOOLS[c.name].label).join(' and ')}.` });
  }
  const answered = input.results.some((r) => r.result);
  const reply = answered ? summary(input.results) || 'Here is what I found.'
    : input.blocked.length ? 'That section is locked on this screen.'
    : input.results.length ? 'I could not read that just now.'
    : HELP_TEXT;
  return {
    reply, cards: cards.slice(0, 6), chips: chipsFor(input.tab),
    meta: { path: input.path, ms: input.ms, tools: input.results.map((r) => r.call.name) },
  };
}

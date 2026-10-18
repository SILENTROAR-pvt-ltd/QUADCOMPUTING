// The keyword router: picks the co-pilot's tools for the questions hosts ask most, with no model. It is also the
// fallback when the model is slow, rate-limited or down. Arguments come from fixed patterns; the invoice number is
// read from the message here, never by the model.
import type { Timeframe, ToolCall, ToolName } from './schema';

const RULES: Array<[ToolName, RegExp]> = [
  ['find_invoice', /\b(ord[\s-]?\d{1,4}|inv[\w-]*\d|invoice|bill (no|number))\b/i],
  ['profit_and_loss', /\b(profit|p\s?&\s?l|pnl|margin|loss|munafa|fayda|net income)\b/i],
  ['top_items', /\b(top|best[\s-]?sell\w*|most (sold|ordered|popular)|popular dish\w*|sabse zyada|what sold)\b/i],
  ['stock_alerts', /\b(stock|inventory|running (low|out)|out of|khatam|reorder|maal)\b/i],
  ['dues', /\b(dues?|owe|outstanding|platform fees?|fees? due|baaki|bakaya|udhaar|pay quad)\b/i],
  ['deliveries', /\b(deliver\w*|zomato|swiggy|parcel|rider)\b/i],
  ['reservations', /\b(reserv\w*|booking\w*|booked)\b/i],
  ['guests', /\b(guests?|customers?|regulars?|footfall|walk[\s-]?ins?|returning)\b/i],
  ['live_tables', /\b(tables?|occupied|seated|longest|vacant|free table)\b/i],
  ['sales_summary', /\b(sales?|revenue|kamai|collection|income|turnover|earn\w*|how did we do|business|bika|compare|performance|today)\b/i],
];

export function timeframeOf(text: string): Timeframe {
  const t = text.toLowerCase();
  if (/\b(yesterday|kal ka|kal ki|kal kitna)\b/.test(t)) return 'yesterday';
  if (/\b(this month|month to date|mtd|is mahine)\b/.test(t)) return 'mtd';
  if (/\b(30 days|last month|pichle mahine)\b/.test(t)) return '30d';
  if (/\b(year|12 months|monthly|saal)\b/.test(t)) return 'monthly';
  if (/\b(week|7 days|hafte|hafta|weekly)\b/.test(t)) return 'weekly';
  return 'daily';
}

/** "ORD-12" -> "ORD-012"; an invoice number as written. Null when the message names none. */
export function invoiceRefOf(text: string): string | null {
  const ord = /\bord[\s-]?(\d{1,4})\b/i.exec(text);
  if (ord) return `ORD-${ord[1].padStart(3, '0')}`;
  const inv = /\b(inv[\w-]*\d[\w-]*)\b/i.exec(text);
  return inv ? inv[1].toUpperCase() : null;
}

/** At most two tools for a message, in order of the rules; empty when nothing matches. */
export function routeByKeywords(text: string): ToolCall[] {
  const timeframe = timeframeOf(text);
  const picked = RULES.filter(([, re]) => re.test(text)).map(([name]) => name);
  // "Today" alone only means sales when nothing more specific matched.
  const names = picked.length > 1 ? picked.filter((n) => n !== 'sales_summary' || /\b(sales?|revenue|kamai|compare|how did we do)\b/i.test(text)) : picked;
  return names.slice(0, 2).map((name): ToolCall => {
    if (name === 'find_invoice') return { name, args: { orderNumber: invoiceRefOf(text) ?? undefined } };
    if (name === 'dues') return { name, args: { range: /\b(today|aaj)\b/i.test(text) ? 'today' : /\b(week|7 days)\b/i.test(text) ? '7d' : 'all' } };
    if (name === 'reservations') return { name, args: { day: /\b(tomorrow|kal)\b/i.test(text) ? 'tomorrow' : 'today' } };
    if (name === 'top_items') return { name, args: { timeframe, limit: 5 } };
    if (['live_tables', 'deliveries', 'stock_alerts'].includes(name)) return { name, args: {} };
    return { name, args: { timeframe } };
  });
}

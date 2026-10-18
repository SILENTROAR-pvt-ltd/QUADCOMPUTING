// Small helpers for the co-pilot's cards: what period a number covers, when it was read, and a per-tool time limit.
import type { Timeframe } from './schema';

export const TIMEFRAME_LABEL: Record<Timeframe, string> = {
  daily: 'Today', yesterday: 'Yesterday', weekly: 'Last 7 days', '30d': 'Last 30 days', mtd: 'This month', monthly: 'Last 12 months',
};

/** "14:32" in India time. */
export const asOf = (now: Date = new Date()) =>
  new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }).format(now);

/** The line under every card: "Today · settled bills · as of 14:32". */
export const scopeLine = (period: string, what: string, now?: Date) => `${period} · ${what} · as of ${asOf(now)}`;

export class ToolTimeout extends Error {
  constructor(public tool: string) { super(`${tool} took too long`); }
}

/** Rejects with ToolTimeout if `work` takes longer than `ms`. */
export function withTimeout<T>(work: Promise<T>, ms: number, tool: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    work.finally(() => clearTimeout(timer)),
    new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new ToolTimeout(tool)), ms); }),
  ]);
}

const r2 = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;
export const money = r2;
export const count = (n: unknown) => Math.max(0, Math.round(Number(n) || 0));

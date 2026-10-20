// The co-pilot's tool allowlist. Every tool is read-only, takes the venue from the session (never from the model or
// the message), runs under a time limit, and belongs to a workspace section so the master-PIN lock applies to it.
import { computeEodReport } from '@/lib/services/analytics.service';
import { ToolTimeout, withTimeout } from './format';
import { dues, findInvoice, guestsReport, profitAndLoss, salesSummary, stockAlerts, topItems } from './tools-money';
import { deliveries, liveTables, reservations } from './tools-floor';
import type { HostCard, Timeframe, ToolArgs, ToolCall, ToolName } from './schema';

export interface ToolContext {
  businessId: string;
  /** The caller's own client (RLS for an owner), as the analytics route uses. */
  db: any;
  /** The service client, as the dues, delivery and reservations routes use; every query filters by businessId. */
  admin: any;
  /** The analytics report for a period, read once per request however many tools need it. */
  eod: (timeframe: Timeframe) => Promise<any>;
}

export interface ToolResult { cards: HostCard[]; facts?: Record<string, number | null> }

interface ToolDef { module: string; run: (ctx: ToolContext, args: ToolArgs) => Promise<ToolResult>; label: string }

/** The only co-pilot tools a staff session (a cashier at the till) may use. Everything else needs the owner. */
export const STAFF_TOOLS: ReadonlySet<string> = new Set(['live_tables', 'find_invoice']);

export const TOOLS: Record<ToolName, ToolDef> = {
  sales_summary: { module: 'dashboard', run: salesSummary, label: 'sales' },
  profit_and_loss: { module: 'dashboard', run: profitAndLoss, label: 'profit and loss' },
  top_items: { module: 'dashboard', run: topItems, label: 'top dishes' },
  stock_alerts: { module: 'inventory', run: (ctx) => stockAlerts(ctx), label: 'stock' },
  dues: { module: 'payments', run: dues, label: 'dues' },
  find_invoice: { module: 'payments', run: findInvoice, label: 'a bill' },
  live_tables: { module: 'tables', run: (ctx) => liveTables(ctx), label: 'tables' },
  deliveries: { module: 'delivery', run: (ctx) => deliveries(ctx), label: 'deliveries' },
  reservations: { module: 'reservations', run: reservations, label: 'reservations' },
  guests: { module: 'guests', run: guestsReport, label: 'guests' },
};

export const TOOL_TIMEOUT_MS = 9000;

export function makeContext(businessId: string, db: any, admin: any): ToolContext {
  const reports = new Map<Timeframe, Promise<any>>();
  return {
    businessId, db, admin,
    eod: (timeframe) => {
      if (!reports.has(timeframe)) reports.set(timeframe, computeEodReport(`https://vibey.local/?timeframe=${timeframe}`, db, businessId));
      return reports.get(timeframe)!;
    },
  };
}

/** Runs the chosen tools in parallel. A failed or slow tool becomes a note card; the others still answer. */
export async function runTools(ctx: ToolContext, calls: ToolCall[]): Promise<Array<{ call: ToolCall; result: ToolResult | null; error: string | null }>> {
  return Promise.all(calls.map(async (call) => {
    try {
      return { call, result: await withTimeout(TOOLS[call.name].run(ctx, call.args), TOOL_TIMEOUT_MS, call.name), error: null };
    } catch (err: any) {
      console.warn(`[vibey] host tool ${call.name} failed:`, err?.message);
      return { call, result: null, error: err instanceof ToolTimeout ? 'timeout' : 'failed' };
    }
  }));
}

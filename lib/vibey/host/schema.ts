// The host co-pilot's shapes. Its answers are cards that carry the services' own numbers; the venue is never an
// argument (it comes from the session), and the model may only pick tools from a fixed list with bounded arguments.
import { z } from 'zod';

export const TOOL_NAMES = [
  'sales_summary', 'profit_and_loss', 'top_items', 'stock_alerts', 'dues', 'find_invoice', 'live_tables', 'deliveries', 'reservations', 'guests',
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

export const TIMEFRAMES = ['daily', 'yesterday', 'weekly', '30d', 'mtd', 'monthly'] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export const toolArgsSchema = z.object({
  timeframe: z.enum(TIMEFRAMES).optional(),
  limit: z.number().int().min(1).max(10).optional(),
  range: z.enum(['today', '7d', 'all']).optional(),
  day: z.enum(['today', 'tomorrow']).optional(),
  /** Read from the host's message by code, never from the model. */
  orderNumber: z.string().max(40).optional(),
});
export type ToolArgs = z.infer<typeof toolArgsSchema>;
export interface ToolCall { name: ToolName; args: ToolArgs }

/** What the model may answer when routing: at most two tools from the list. */
export const routeSchema = z.object({
  tools: z.array(z.object({
    name: z.enum(TOOL_NAMES),
    timeframe: z.enum(TIMEFRAMES).nullable().optional(),
    limit: z.number().int().min(1).max(10).nullable().optional(),
    range: z.enum(['today', '7d', 'all']).nullable().optional(),
    day: z.enum(['today', 'tomorrow']).nullable().optional(),
  })).max(2),
});

export const hostRequestSchema = z.object({
  text: z.string().trim().min(1).max(300),
  /** The screen's master-PIN state, mirroring the client gate (the server token comes in Phase 4). */
  unlocked: z.boolean().default(false),
  tab: z.string().max(40).optional(),
});
export type HostRequest = z.infer<typeof hostRequestSchema>;

const fmt = z.enum(['money', 'count', 'pct', 'text']);
const link = z.object({ tab: z.string(), label: z.string() }).optional();

export const hostCardSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('kpis'), title: z.string(), scope: z.string(), items: z.array(z.object({ label: z.string(), value: z.union([z.number(), z.null()]), format: fmt })), link }),
  z.object({ kind: z.literal('rows'), title: z.string(), scope: z.string(), rows: z.array(z.object({ label: z.string(), value: z.union([z.number(), z.string(), z.null()]), format: fmt, sub: z.string().optional() })), empty: z.string().optional(), link }),
  z.object({ kind: z.literal('note'), title: z.string(), text: z.string(), link }),
]);
export type HostCard = z.infer<typeof hostCardSchema>;

export const hostReplySchema = z.object({
  reply: z.string().max(600),
  cards: z.array(hostCardSchema).max(6),
  chips: z.array(z.string().max(60)).max(4),
  meta: z.object({ path: z.enum(['keyword', 'model', 'fallback']), ms: z.number(), tools: z.array(z.string()) }),
});
export type VibeyHostReply = z.infer<typeof hostReplySchema>;

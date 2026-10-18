// The shapes that cross a boundary: what the phone sends, what the model may answer, and what Vibey replies.
// The model's shape has no dish id, price or total on purpose: those come from the menu, in code.
import { z } from 'zod';

export const INTENTS = ['add', 'remove', 'set_qty', 'ask', 'browse', 'checkout', 'call_staff', 'smalltalk'] as const;
export type Intent = (typeof INTENTS)[number];
export const QUESTIONS = ['popular', 'price', 'describe', 'dietary', 'wait_time', 'other'] as const;

export const guestRequestSchema = z.object({
  cafe_id: z.string().trim().min(1).max(80),
  table_number: z.string().trim().min(1).max(12),
  text: z.string().trim().min(1).max(300),
  history: z.array(z.object({ role: z.enum(['guest', 'vibey']), text: z.string().max(600) })).max(6).default([]),
  tray: z.array(z.object({ itemId: z.string().min(1).max(64), qty: z.number().int().min(1).max(99) })).max(40).default([]),
});
export type GuestRequest = z.infer<typeof guestRequestSchema>;

export const mentionSchema = z.object({
  dish_words: z.string().trim().min(1).max(80),
  qty: z.number().int().min(1).max(20).nullable().optional(),
  note: z.string().trim().max(80).nullable().optional(),
});

/** What the model may say about a guest message. */
export const understoodSchema = z.object({
  intent: z.enum(INTENTS),
  mentions: z.array(mentionSchema).max(10).default([]),
  topic: z.string().trim().max(40).nullable().optional(),
  question: z.enum(QUESTIONS).nullable().optional(),
});
export type Understood = z.infer<typeof understoodSchema>;
export type Mention = z.infer<typeof mentionSchema>;

const MAX_QTY = 20;
export const clampQty = (n: unknown, fallback = 1) => {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v >= 1 ? Math.min(v, MAX_QTY) : fallback;
};

export const guestActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('add'), itemId: z.string(), qty: z.number().int().min(1).max(MAX_QTY), note: z.string().max(120).optional() }),
  z.object({ type: z.literal('remove'), itemId: z.string(), qty: z.number().int().min(1).max(99).optional() }),
  z.object({ type: z.literal('set_qty'), itemId: z.string(), qty: z.number().int().min(1).max(MAX_QTY) }),
  z.object({ type: z.literal('open_tray') }),
  z.object({ type: z.literal('call_staff'), reason: z.enum(['help', 'dietary', 'other']) }),
]);
export type GuestAction = z.infer<typeof guestActionSchema>;

export const guestReplySchema = z.object({
  reply: z.string().min(1).max(600),
  actions: z.array(guestActionSchema).max(10),
  cards: z.array(z.object({ itemId: z.string() })).max(8),
  chips: z.array(z.string().max(48)).max(4),
  meta: z.object({ path: z.enum(['fastpath', 'model', 'fallback']), ms: z.number(), intent: z.string() }),
});
export type VibeyGuestReply = z.infer<typeof guestReplySchema>;

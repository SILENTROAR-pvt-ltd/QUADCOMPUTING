// When each stage of a kitchen ticket happened, read from the ticket's own status history, plus how long
// it has been in its current stage and whether that is getting late.
import type { KitchenTicket } from './kitchen';

export type KotStageKey = 'placed' | 'started' | 'ready' | 'served';

export interface KotStage {
  key: KotStageKey;
  label: string;
  at: Date | null;
}

export interface KotTimeline {
  stages: KotStage[];
  /** Minutes in the current stage; for a served ticket, the whole turnaround. */
  stageMinutes: number;
  totalMinutes: number;
  urgency: 'ok' | 'warn' | 'late';
}

const LABELS: Record<KotStageKey, string> = { placed: 'Placed', started: 'Started', ready: 'Ready', served: 'Served' };
const STAGE_OF: Record<string, KotStageKey> = { PREPARING: 'started', READY: 'ready', SERVED: 'served' };
// Minutes in a stage before the card turns amber, and before it turns red.
const LIMITS: Record<string, [number, number]> = { PENDING: [5, 10], PREPARING: [15, 25], READY: [5, 10] };

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function minutesBetween(from: Date | null, to: Date | number | null): number | null {
  if (!from || to === null) return null;
  const end = typeof to === 'number' ? to : to.getTime();
  return Math.max(0, Math.floor((end - from.getTime()) / 60000));
}

export function kotTimeline(ticket: KitchenTicket, nowMs = Date.now()): KotTimeline {
  const at: Record<KotStageKey, Date | null> = { placed: toDate(ticket.created_at), started: null, ready: null, served: null };
  for (const h of ticket.status_history ?? []) {
    const stage = STAGE_OF[String(h?.to ?? '').toUpperCase()];
    if (stage) at[stage] = toDate(h.at);
  }

  // Tickets from before the history existed: item timestamps, and updated_at for a served ticket.
  const first = ticket.items?.[0];
  if (!at.started) at.started = toDate(first?.started_at);
  if (!at.ready) at.ready = toDate(first?.ready_at);
  if (ticket.status === 'SERVED' && !at.served) at.served = toDate(first?.delivered_at) ?? toDate(ticket.updated_at);

  const stageStart =
    ticket.status === 'READY' ? at.ready ?? at.placed
    : ticket.status === 'PREPARING' ? at.started ?? at.placed
    : at.placed;
  const served = ticket.status === 'SERVED';
  const totalMinutes = minutesBetween(at.placed, served && at.served ? at.served : nowMs) ?? 0;
  const stageMinutes = served ? totalMinutes : minutesBetween(stageStart, nowMs) ?? 0;

  const [warn, late] = LIMITS[ticket.status] ?? [Infinity, Infinity];
  const urgency = stageMinutes >= late ? 'late' : stageMinutes >= warn ? 'warn' : 'ok';

  const keys: KotStageKey[] = ['placed', 'started', 'ready', 'served'];
  return { stages: keys.map((key) => ({ key, label: LABELS[key], at: at[key] })), stageMinutes, totalMinutes, urgency };
}

// How each ticket status looks on the kitchen board, and the one next step the kitchen can take from it.
// The steps follow update_kot_status: PENDING -> PREPARING -> READY -> SERVED.
import type { KitchenTicket } from '@/lib/utils/kitchen';

type Status = KitchenTicket['status'];

export interface KotStatusStyle {
  label: string;
  /** Top band of the card. */
  band: string;
  chip: string;
  /** What the timer measures in this status. */
  timerLabel: string;
  next?: { to: Status; label: string; button: string };
}

export const KOT_STATUS: Record<Status, KotStatusStyle> = {
  PENDING: {
    label: 'New',
    band: 'bg-amber-400',
    chip: 'bg-amber-50 text-amber-900 border-amber-200',
    timerLabel: 'waiting',
    next: { to: 'PREPARING', label: 'Start preparing', button: 'bg-neutral-950 hover:bg-neutral-800 text-white' },
  },
  PREPARING: {
    label: 'Preparing',
    band: 'bg-sky-500',
    chip: 'bg-sky-50 text-sky-900 border-sky-200',
    timerLabel: 'cooking',
    next: { to: 'READY', label: 'Mark ready', button: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  },
  READY: {
    label: 'Ready',
    band: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    timerLabel: 'to serve',
    next: { to: 'SERVED', label: 'Mark served', button: 'bg-neutral-950 hover:bg-neutral-800 text-white' },
  },
  SERVED: {
    label: 'Served',
    band: 'bg-neutral-300',
    chip: 'bg-neutral-100 text-neutral-700 border-neutral-200',
    timerLabel: 'total',
  },
  CANCELLED: {
    label: 'Cancelled',
    band: 'bg-rose-300',
    chip: 'bg-rose-50 text-rose-800 border-rose-200',
    timerLabel: 'total',
  },
};

export const URGENCY_PILL: Record<'ok' | 'warn' | 'late', string> = {
  ok: 'bg-neutral-100 text-neutral-700',
  warn: 'bg-amber-100 text-amber-900',
  late: 'bg-rose-600 text-white',
};

export const clockTime = (d: Date | null) =>
  d ? d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : null;

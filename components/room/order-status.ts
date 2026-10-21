// What an in-room order's kitchen status means to the guest, in their words and a colour. The kitchen's ticket status
// comes first, then the order's own, the same rule as the menu's tracker (tracker-copy.ts).

import { resolveTrackerStage } from '@/components/guest/menu/tracker/tracker-copy';

export type OrderTone = 'wait' | 'busy' | 'go' | 'done' | 'off';

export function orderStatus(raw: string, kot?: string | null): { label: string; tone: OrderTone } {
  const s = String(raw || '').toUpperCase();
  if (['CANCELLED', 'REJECTED', 'VOID'].includes(s)) return { label: 'Cancelled', tone: 'off' };
  switch (resolveTrackerStage(kot || '', s)) {
    case 'served': return { label: 'Delivered', tone: 'done' };
    case 'ready': return { label: 'On its way', tone: 'go' };
    case 'preparing': return { label: 'Being prepared', tone: 'busy' };
    default: return { label: 'Received', tone: 'wait' };
  }
}

export const ORDER_TONE: Record<OrderTone, string> = {
  wait: 'bg-neutral-100 text-neutral-700 ring-neutral-200',
  busy: 'bg-amber-50 text-amber-800 ring-amber-200',
  go: 'bg-sky-50 text-sky-800 ring-sky-200',
  done: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  off: 'bg-rose-50 text-rose-700 ring-rose-200',
};

// What an in-room order's kitchen status means to the guest, in their words and a colour.

export type OrderTone = 'wait' | 'busy' | 'go' | 'done' | 'off';

export function orderStatus(raw: string): { label: string; tone: OrderTone } {
  const s = String(raw || '').toUpperCase();
  if (['SERVED', 'COMPLETED', 'DELIVERED'].includes(s)) return { label: 'Delivered', tone: 'done' };
  if (s === 'READY') return { label: 'On its way', tone: 'go' };
  if (['PREPARING', 'PROCESSING', 'STARTED', 'COOKING', 'IN_PROGRESS', 'ACCEPTED'].includes(s)) return { label: 'Being prepared', tone: 'busy' };
  if (['CANCELLED', 'REJECTED', 'VOID'].includes(s)) return { label: 'Cancelled', tone: 'off' };
  return { label: 'Received', tone: 'wait' };
}

export const ORDER_TONE: Record<OrderTone, string> = {
  wait: 'bg-neutral-100 text-neutral-700 ring-neutral-200',
  busy: 'bg-amber-50 text-amber-800 ring-amber-200',
  go: 'bg-sky-50 text-sky-800 ring-sky-200',
  done: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  off: 'bg-rose-50 text-rose-700 ring-rose-200',
};

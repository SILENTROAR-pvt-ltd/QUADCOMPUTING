import type { DishState } from '@/lib/utils/table-kitchen';

/** The words and colours for where a dish is, shared by a table's kitchen tab and the orders board. */
export const DISH: Record<DishState, { label: string; chip: string }> = {
  waiting: { label: 'Waiting', chip: 'bg-neutral-100 text-neutral-700' },
  cooking: { label: 'Cooking', chip: 'bg-sky-100 text-sky-900' },
  ready: { label: 'Ready to serve', chip: 'bg-emerald-100 text-emerald-900' },
  served: { label: 'Served', chip: 'bg-neutral-200 text-neutral-600' },
};

/** Whole minutes since `iso`, or null when it is missing or unreadable. */
export function minutesSince(iso: string | undefined, now: number): number | null {
  const t = Date.parse(iso || '');
  return Number.isFinite(t) ? Math.max(0, Math.round((now - t) / 60000)) : null;
}

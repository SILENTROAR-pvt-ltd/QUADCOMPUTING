// Who may move a kitchen ticket where. The kitchen cooks and hands over: PENDING -> PREPARING -> READY. Served is the
// waiter's step, taken from Live Tables once the dish is at the table; a chef's sign-in cannot take it for them.
import type { StaffRole } from '@/lib/services/staff-auth/staff-roles';

export const SERVED_BY_WAITER = 'Served is marked by the waiter from Live Tables; the kitchen marks the order ready.';

/** Why this sign-in may not put a ticket into `status`, or null when it may. The owner and the floor roles may do anything. */
export function kotStatusRefusal(role: StaffRole | undefined, status: unknown): string | null {
  if (role === 'CHEF' && String(status || '').toUpperCase() === 'SERVED') return SERVED_BY_WAITER;
  return null;
}

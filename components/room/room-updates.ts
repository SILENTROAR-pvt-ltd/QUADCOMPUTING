import type { RoomState } from './useRoomStay';

/** One thing the desk did that the guest should hear about, shown as a short alert on the room page. */
export interface RoomUpdate { id: string; title: string; body: string; tone: 'good' | 'info' }

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/**
 * What changed between two reads of the room that the guest did not do themselves: a request marked done, a late
 * check-out confirmed or declined, a payment recorded at the desk. Pure, so it is tested; the first read has no
 * "before" and reports nothing.
 */
export function roomUpdates(before: RoomState | null, after: RoomState | null): RoomUpdate[] {
  if (!before || !after || !before.verified || !after.verified || before.room.id !== after.room.id) return [];
  const out: RoomUpdate[] = [];

  const was = new Map((before.requests || []).map((r) => [r.id, r.status]));
  for (const r of after.requests || []) {
    if (r.status === 'done' && was.get(r.id) === 'waiting') {
      out.push({ id: `req-${r.id}`, title: 'Request done', body: r.message || 'The desk has handled your request.', tone: 'good' });
    }
  }

  const lateBefore = before.late_checkout?.request;
  const lateAfter = after.late_checkout?.request;
  if (lateBefore?.status === 'pending' && !lateAfter && after.late_checkout?.current) {
    out.push({ id: `late-ok-${after.late_checkout.current}`, title: 'Late check-out confirmed', body: `You can stay until ${after.late_checkout.current}.`, tone: 'good' });
  } else if (lateBefore?.status === 'pending' && lateAfter?.status === 'declined') {
    out.push({ id: `late-no-${lateAfter.label}`, title: 'Late check-out not possible', body: 'The desk could not extend your stay this time.', tone: 'info' });
  }

  const paidBefore = Number(before.folio?.advance_paid || 0);
  const paidAfter = Number(after.folio?.advance_paid || 0);
  if (paidAfter > paidBefore + 0.5) {
    out.push({ id: `paid-${paidAfter}`, title: 'Payment received', body: `${inr(paidAfter - paidBefore)} recorded by the desk. Thank you.`, tone: 'good' });
  }
  return out;
}

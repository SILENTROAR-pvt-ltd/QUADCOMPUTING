import type { PublicEvent } from '@/lib/services/live-events/events.service';

export type GuestEvent = PublicEvent;

const IST = 'Asia/Kolkata';

/** "Sat, 1 Nov" and "7:30 PM", in the venue's own time (India), whatever the guest's phone is set to. */
export function eventDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: IST });
}
export function eventTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST }).toUpperCase();
}

export const feeLabel = (fee: number) => (fee > 0 ? `₹${fee.toLocaleString('en-IN')} entry` : 'Free entry');

export function spotsLabel(e: GuestEvent): string | null {
  if (e.spots_left === null) return null;
  if (e.spots_left === 0) return 'Full';
  if (e.has_split) return `Men: ${e.spots_left_men ?? 0} left · Women: ${e.spots_left_women ?? 0} left`;
  return e.spots_left <= 10 ? `Only ${e.spots_left} spots left` : `${e.spots_left} spots left`;
}

/** Whether nobody more can join: the pool is full, or (with a split) both genders' seats are. */
export function isFull(e: GuestEvent): boolean {
  if (e.spots_left === 0) return true;
  return e.has_split && (e.spots_left_men ?? 0) === 0 && (e.spots_left_women ?? 0) === 0;
}

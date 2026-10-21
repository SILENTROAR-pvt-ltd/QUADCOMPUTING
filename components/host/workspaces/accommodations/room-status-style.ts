import type { PhysicalRoom, RoomStatus } from '@/types';
import { businessDateString } from '@/lib/utils/business-day';

/** What the front desk shows: a room's real status, or Reserved for a free room that a booking is holding. */
export type DisplayStatus = RoomStatus | 'RESERVED';

/** One look per room status, shared by the cards, filters and summary tiles. */
export const ROOM_STATUS_STYLE: Record<DisplayStatus, { label: string; dot: string; chip: string; ring: string; action: string }> = {
  VACANT: { label: 'Vacant', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200', ring: 'hover:border-emerald-300', action: 'Check in a guest' },
  RESERVED: { label: 'Reserved', dot: 'bg-violet-500', chip: 'bg-violet-50 text-violet-800 ring-violet-200', ring: 'border-violet-200 hover:border-violet-300', action: 'Check in the reservation' },
  OCCUPIED: { label: 'Occupied', dot: 'bg-sky-500', chip: 'bg-sky-50 text-sky-800 ring-sky-200', ring: 'hover:border-sky-300', action: 'Open folio' },
  CLEANING: { label: 'Housekeeping', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-800 ring-amber-200', ring: 'hover:border-amber-300', action: 'Mark ready' },
  MAINTENANCE: { label: 'On hold', dot: 'bg-neutral-400', chip: 'bg-neutral-100 text-neutral-700 ring-neutral-200', ring: 'hover:border-neutral-400', action: 'Inspect' },
};

/** The status the desk reads: a free room held by a booking is Reserved, not Vacant. */
export const displayStatus = (room: Pick<PhysicalRoom, 'status' | 'reserved_for'>): DisplayStatus =>
  room.status === 'VACANT' && room.reserved_for ? 'RESERVED' : room.status;

export const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });

/** When an occupied room is due out: today, overdue, or a date. */
export function departure(room: PhysicalRoom): { text: string; tone: 'due' | 'late' | 'normal' } | null {
  const out = room.check_out_time || room.check_out_date;
  if (room.status !== 'OCCUPIED' || !out) return null;
  const due = businessDateString(new Date(out));
  const today = businessDateString();
  if (Date.parse(out) < Date.now()) return { text: `Overdue since ${shortDate(out)}`, tone: 'late' };
  if (due === today) return { text: 'Due out today', tone: 'due' };
  return { text: `Due out ${shortDate(out)}`, tone: 'normal' };
}

export function checkedInLabel(room: PhysicalRoom): string | null {
  const at = room.check_in_time || room.check_in_date;
  return at ? `In since ${shortDate(at)}` : null;
}

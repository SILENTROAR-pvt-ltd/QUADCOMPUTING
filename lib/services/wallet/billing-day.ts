/**
 * The venue's billing day. The floor runs 10:00 AM to 10:00 PM IST and the day closes at 10:00 PM: a bill settled
 * after 10 PM rolls into the next day's slip, so the late-night and early-morning bills are never lost between days.
 * India has no daylight saving, so IST is a fixed +05:30.
 */
import { BUSINESS_TZ_OFFSET_MS, isDateOnly } from '@/lib/utils/business-day';

export const WINDOW_OPEN_HOUR = 10;
export const CUTOFF_HOUR = 22;
const DAY_MS = 24 * 60 * 60 * 1000;

const istParts = (at: Date | number | string) => {
  const shifted = new Date(new Date(at).getTime() + BUSINESS_TZ_OFFSET_MS);
  return { date: shifted.toISOString().slice(0, 10), hour: shifted.getUTCHours() };
};

/** YYYY-MM-DD plus or minus whole days. */
export function shiftDay(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Which billing day a bill belongs to: its IST date, or the next date once it is 10 PM or later. */
export function billingDayOf(at: Date | number | string): string {
  const { date, hour } = istParts(at);
  return hour >= CUTOFF_HOUR ? shiftDay(date, 1) : date;
}

/** Whether the bill was settled inside the 10 AM to 10 PM window (otherwise it is an after-hours bill of that day). */
export function inOperatingWindow(at: Date | number | string): boolean {
  const { hour } = istParts(at);
  return hour >= WINDOW_OPEN_HOUR && hour < CUTOFF_HOUR;
}

/** [previous day 10 PM, this day 10 PM) IST, as absolute instants. */
export function billingDayBounds(day: string): { start: Date; end: Date } {
  const end = new Date(`${day}T${String(CUTOFF_HOUR).padStart(2, '0')}:00:00.000+05:30`);
  return { start: new Date(end.getTime() - DAY_MS), end };
}

/** The bounds covering every billing day from `from` to `to`, inclusive. */
export function billingRangeBounds(from: string, to: string): { start: Date; end: Date } {
  return { start: billingDayBounds(from).start, end: billingDayBounds(to).end };
}

/** Today's billing day. */
export const currentBillingDay = (now: Date | number = Date.now()) => billingDayOf(now);

export const isBillingDay = isDateOnly;

/** Whole days from `from` to `to`, inclusive; negative when they are the wrong way round. */
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;

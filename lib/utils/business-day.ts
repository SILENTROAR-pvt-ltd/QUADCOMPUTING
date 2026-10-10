// Venues are in India (INR/UPI/GST); a "business day" is an IST calendar day. India has no DST.
// Using the server's local zone (UTC on most hosts) puts 00:00-05:30 IST sales on the previous day.
export const BUSINESS_TZ_OFFSET_MS = 330 * 60 * 1000;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function isDateOnly(value: unknown): value is string {
  return typeof value === 'string' && DATE_ONLY.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** YYYY-MM-DD of the given instant in IST. */
export function businessDateString(at: Date | number = new Date()): string {
  return new Date(Number(at) + BUSINESS_TZ_OFFSET_MS).toISOString().slice(0, 10);
}

/** [00:00:00.000, 23:59:59.999] IST of a YYYY-MM-DD date, as absolute instants. */
export function businessDayRange(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00.000+05:30`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1) };
}

/** 0-23 hour of the given instant in IST. */
export function businessHour(at: Date): number {
  return new Date(at.getTime() + BUSINESS_TZ_OFFSET_MS).getUTCHours();
}

/** Status spellings written by different code paths ('settled' from the RPC, 'SETTLED' from room checkout). */
export const SETTLED_STATUSES = ['settled', 'SETTLED'] as const;
export const CANCELLED_STATUSES = ['cancelled', 'CANCELLED'] as const;

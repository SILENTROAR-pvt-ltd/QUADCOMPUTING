import { businessDateString } from '@/lib/utils/business-day';

// A payroll or bills month is an India-time calendar month, written YYYY-MM.

export const isPeriod = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

export const currentPeriod = (at: Date = new Date()) => businessDateString(at).slice(0, 7);

export function periodRange(period: string): { first: string; last: string; days: number } {
  const [y, m] = period.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { first: `${period}-01`, last: `${period}-${String(days).padStart(2, '0')}`, days };
}

export function shiftPeriod(period: string, months: number): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return d.toISOString().slice(0, 7);
}

/** "October 2026". */
export const periodLabel = (period: string) =>
  new Date(`${period}-15T12:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Days between two YYYY-MM-DD dates, both included. */
export const daysInclusive = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;

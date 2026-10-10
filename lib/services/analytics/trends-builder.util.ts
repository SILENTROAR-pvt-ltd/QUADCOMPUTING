// Time buckets for the analytics chart, in the venue's business day (India time), never the server's clock.
// A daily view is 24 hours, a week is 7 days, a month view is months, and a custom range picks its own grain.
import { businessDateString, businessHour } from '@/lib/utils/business-day';

export type TrendEntry = { revenue: number; expenses: number; orders: number; label: string; timestamp: string };
export type Grain = 'hour' | 'day' | 'month';

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

export function grainFor(timeframe: string, startISO: string, endISO: string): Grain {
  if (timeframe === 'daily') return 'hour';
  if (timeframe === 'weekly') return 'day';
  if (timeframe === 'monthly') return 'month';
  const days = (Date.parse(endISO) - Date.parse(startISO)) / DAY_MS;
  return days <= 1.01 ? 'hour' : days <= 62 ? 'day' : 'month';
}

/** The bucket an event falls in: "13:00", "2026-10-08" or "2026-10". */
export function bucketKey(at: Date, grain: Grain): string {
  if (grain === 'hour') return `${pad(businessHour(at))}:00`;
  const day = businessDateString(at);
  return grain === 'day' ? day : day.slice(0, 7);
}

export function bucketLabel(key: string, grain: Grain, weekly = false): string {
  if (grain === 'hour') {
    const h = Number(key.slice(0, 2));
    return `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? 'PM' : 'AM'}`;
  }
  if (grain === 'day') {
    const opts: Intl.DateTimeFormatOptions = weekly ? { weekday: 'short', day: 'numeric' } : { day: 'numeric', month: 'short' };
    return new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', ...opts });
  }
  return new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', month: 'short', year: '2-digit' });
}

const entry = (label: string, timestamp: string): TrendEntry => ({ revenue: 0, expenses: 0, orders: 0, label, timestamp });

/** Every bucket in the range, empty, so quiet hours and days still show on the chart. */
export function buildInitialTrendsMap(timeframe: string, startISO: string, endISO: string): Record<string, TrendEntry> {
  const grain = grainFor(timeframe, startISO, endISO);
  const weekly = timeframe === 'weekly';
  const firstDay = businessDateString(new Date(startISO));
  const lastDay = businessDateString(new Date(endISO));
  const map: Record<string, TrendEntry> = {};

  if (grain === 'hour') {
    for (let h = 0; h < 24; h++) {
      const key = `${pad(h)}:00`;
      map[key] = entry(bucketLabel(key, grain), `${firstDay}T${key}:00+05:30`);
    }
  } else if (grain === 'day') {
    for (let t = Date.parse(`${firstDay}T00:00:00Z`); t <= Date.parse(`${lastDay}T00:00:00Z`); t += DAY_MS) {
      const key = new Date(t).toISOString().slice(0, 10);
      map[key] = entry(bucketLabel(key, grain, weekly), `${key}T00:00:00+05:30`);
    }
  } else {
    const [y0, m0] = firstDay.split('-').map(Number);
    const last = lastDay.slice(0, 7);
    for (let i = 0; i < 240; i++) {
      const key = new Date(Date.UTC(y0, m0 - 1 + i, 1)).toISOString().slice(0, 7);
      if (key > last) break;
      map[key] = entry(bucketLabel(key, grain), `${key}-01T00:00:00+05:30`);
    }
  }
  return map;
}

import type { HistoryRow } from '@/lib/services/wallet/wallet-history.service';
import type { WalletHistoryFilters } from '../useWalletHistory';

export type Period = 'all' | '7' | '30' | 'custom';

export const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const TYPE_TABS: Array<{ value: WalletHistoryFilters['type']; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'CASHBACK', label: 'Earned' },
  { value: 'REDEMPTION', label: 'Used' },
  { value: 'ADJUSTMENT', label: 'Adjusted' },
];
export const TYPE_LABEL: Record<string, string> = { CASHBACK: 'Cashback earned', REDEMPTION: 'Used on bill', ADJUSTMENT: 'Adjustment' };

/** Days are read in the venue's time zone (India), so "today" is the same day the bill was settled on. */
export const istDay = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
export const istToday = () => istDay(new Date().toISOString());
export const shiftDay = (day: string, delta: number) => new Date(Date.parse(`${day}T00:00:00Z`) + delta * 86_400_000).toISOString().slice(0, 10);

export function dayLabel(day: string): string {
  const today = istToday();
  if (day === today) return 'Today';
  if (day === shiftDay(today, -1)) return 'Yesterday';
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
}

export const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });

/** Rows are newest first, so a new day begins whenever the day changes. */
export function groupByDay(rows: HistoryRow[]) {
  const groups: Array<{ day: string; items: HistoryRow[] }> = [];
  for (const row of rows) {
    const day = istDay(row.created_at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(row);
    else groups.push({ day, items: [row] });
  }
  return groups;
}

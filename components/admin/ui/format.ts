// Formatting for the admin dashboard: rupees, compact rupees for axes, counts, dates and "x minutes ago".
export { compactInr } from '@/components/host/workspaces/dashboard/chart-scale';

export const inr = (n: number | null | undefined, digits = 0) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const count = (n: number | null | undefined) => (n === null || n === undefined ? '—' : n.toLocaleString('en-IN'));

export const dateShort = (iso: string | null | undefined) =>
  iso ? new Date(iso.length === 10 ? `${iso}T00:00:00+05:30` : iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—';

export const dayLabel = (day: string) => new Date(`${day}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

export function ago(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—';
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86_400)} d ago`;
}

export const pctChange = (v: number | null) => (v === null ? 'new' : `${v > 0 ? '+' : ''}${v}%`);

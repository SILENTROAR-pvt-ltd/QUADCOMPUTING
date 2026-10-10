import type { StockStatus } from '@/lib/services/inventory/inventory.types';

export const inr = (n: number, digits = 0) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

/** A quantity in its unit, without trailing zeros: 2.5 kg, 12 pcs, -0.25 ltr. */
export function qty(n: number, unit?: string) {
  const v = Math.round((Number(n) || 0) * 1000) / 1000;
  return `${v.toLocaleString('en-IN', { maximumFractionDigits: 3 })}${unit ? ` ${unit}` : ''}`;
}

export const STATUS_STYLE: Record<StockStatus, { label: string; chip: string; bar: string }> = {
  ok: { label: 'In stock', chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200', bar: 'bg-emerald-500' },
  low: { label: 'Low', chip: 'bg-amber-50 text-amber-800 ring-amber-200', bar: 'bg-amber-500' },
  out: { label: 'Out', chip: 'bg-rose-50 text-rose-800 ring-rose-200', bar: 'bg-rose-500' },
  negative: { label: 'Below zero', chip: 'bg-rose-100 text-rose-900 ring-rose-300', bar: 'bg-rose-600' },
};

export const MOVEMENT_STYLE: Record<string, { label: string; chip: string }> = {
  PURCHASE: { label: 'Purchase', chip: 'bg-emerald-50 text-emerald-800' },
  OPENING: { label: 'Opening stock', chip: 'bg-emerald-50 text-emerald-800' },
  CONSUMPTION: { label: 'Used in sales', chip: 'bg-sky-50 text-sky-800' },
  WASTAGE: { label: 'Wastage', chip: 'bg-rose-50 text-rose-800' },
  ADJUSTMENT: { label: 'Adjustment', chip: 'bg-neutral-100 text-neutral-700' },
  COUNT: { label: 'Stock count', chip: 'bg-violet-50 text-violet-800' },
  MANUAL_ADJUSTMENT: { label: 'Adjustment', chip: 'bg-neutral-100 text-neutral-700' },
  MANUAL_ADJUST: { label: 'Count variance', chip: 'bg-violet-50 text-violet-800' },
};

export const movementStyle = (type: string) => MOVEMENT_STYLE[type] || { label: type.toLowerCase(), chip: 'bg-neutral-100 text-neutral-700' };

export const istDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });

/** "2.9 days", "Under a day", or nothing when the item is not used by any sold dish. */
export function coverText(days: number | null): string | null {
  if (days === null) return null;
  if (days < 1) return 'Under a day';
  return `${days >= 10 ? Math.round(days) : days} days`;
}

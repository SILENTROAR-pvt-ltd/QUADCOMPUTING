import type { DineInSessionStatus, OrderItemRecord } from '@/types/qr-session';

export interface OrderTotalSummary {
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  totalQuantity: number;
}

/**
 * A line may carry its own `tax_rate` (fraction, e.g. 0.18 for a service);
 * lines without one use `taxRatePercent` (5% — restaurant food).
 */
export function calculateOrderTotals(
  items: Array<{ price: number; quantity: number; tax_rate?: number | null }>,
  taxRatePercent: number = 5
): OrderTotalSummary {
  const lineTotal = (item: { price: number; quantity: number }) =>
    (Number(item.price) || 0) * Math.max(0, Number(item.quantity) || 0);

  const subtotal = (items || []).reduce((acc, item) => acc + lineTotal(item), 0);

  const totalQuantity = (items || []).reduce((acc, item) => {
    return acc + Math.max(0, Number(item.quantity) || 0);
  }, 0);

  const rawTax = (items || []).reduce((acc, item) => {
    const rate = typeof item.tax_rate === 'number' && Number.isFinite(item.tax_rate) ? item.tax_rate : taxRatePercent / 100;
    return acc + lineTotal(item) * rate;
  }, 0);
  const taxAmount = Number(rawTax.toFixed(2));
  const grandTotal = Number((subtotal + taxAmount).toFixed(2));

  return {
    subtotal: Number(subtotal.toFixed(2)),
    taxAmount,
    grandTotal,
    totalQuantity,
  };
}

export interface AggregatedCartLine {
  id: string;
  name: string;
  price: number;
  qty: number;
  notes?: string;
  kot_status?: string;
}

export function aggregateOrderItems(items: Array<any>): AggregatedCartLine[] {
  const map = new Map<string, AggregatedCartLine>();

  for (const item of items || []) {
    const itemName = item.item_name || item.name || 'Item';
    const key = `${item.item_id || itemName}-${item.price}`;
    const qty = Number(item.quantity ?? item.qty ?? 1);
    const existing = map.get(key);

    if (existing) {
      existing.qty += qty;
      if (item.notes && !existing.notes?.includes(item.notes)) {
        existing.notes = existing.notes ? `${existing.notes}, ${item.notes}` : item.notes;
      }
    } else {
      map.set(key, {
        id: item.item_id || item.id || itemName,
        name: itemName,
        price: Number(item.price) || 0,
        qty,
        notes: item.notes || undefined,
        kot_status: item.kot_status,
      });
    }
  }

  return Array.from(map.values());
}

export function getTableVisualState(sessionStatus?: DineInSessionStatus | null): {
  color: 'grey' | 'green' | 'amber';
  label: string;
  badgeStyle: string;
  borderStyle: string;
} {
  switch (sessionStatus) {
    case 'bill_requested':
      return {
        color: 'amber',
        label: 'Bill Requested',
        badgeStyle: 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse',
        borderStyle: 'border-amber-400 bg-amber-50/70 ring-2 ring-amber-300/50',
      };
    case 'open':
      return {
        color: 'green',
        label: 'Active (Dining)',
        badgeStyle: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        borderStyle: 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-400/40',
      };
    default:
      return {
        color: 'grey',
        label: 'Available',
        badgeStyle: 'bg-zinc-100 text-zinc-600 border-zinc-200',
        borderStyle: 'border-zinc-200 bg-zinc-50 hover:border-zinc-300',
      };
  }
}

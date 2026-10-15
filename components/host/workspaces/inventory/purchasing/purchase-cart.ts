import type { StockItemView } from '@/lib/services/inventory/inventory.types';
import type { PurchaseLine } from '@/lib/services/inventory/purchase-message';
import { newUuid } from '@/lib/utils/uuid';

/** One line of the purchase being put together: an item already in raw inventory, or one the host types in. */
export interface CartLine {
  /** The stock item's id, or an id made here for a new item. */
  id: string;
  name: string;
  unit: string;
  qty: string;
  cost: string;
  isNew: boolean;
  category?: string;
  /** What is on hand now, for items already in stock. */
  stock?: number;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** A tapped item joins the purchase with the quantity the stock suggests (blank when it needs none) and its last cost. */
export function lineFromItem(item: StockItemView): CartLine {
  const suggested = round3(Math.max(0, item.suggested_order || 0));
  return {
    id: item.id, name: item.item_name, unit: item.unit, isNew: false, stock: item.current_stock,
    qty: suggested > 0 ? String(suggested) : '', cost: item.cost_per_unit ? String(item.cost_per_unit) : '',
  };
}

export function lineFromNew(n: { name: string; unit: string; category: string; qty: string; cost: string }): CartLine {
  return { id: newUuid(), name: n.name.trim(), unit: n.unit, category: n.category.trim() || 'Raw stock', qty: n.qty, cost: n.cost, isNew: true };
}

export const toggleLine = (lines: CartLine[], item: StockItemView): CartLine[] =>
  lines.some((l) => l.id === item.id) ? lines.filter((l) => l.id !== item.id) : [...lines, lineFromItem(item)];

export const patchLine = (lines: CartLine[], id: string, patch: Partial<CartLine>): CartLine[] =>
  lines.map((l) => (l.id === id ? { ...l, ...patch } : l));

export const lineTotal = (l: CartLine) => (Number(l.qty) > 0 ? Number(l.qty) * (Number(l.cost) || 0) : 0);
export const cartTotal = (lines: CartLine[]) => Math.round(lines.reduce((s, l) => s + lineTotal(l), 0) * 100) / 100;

/** Why the purchase cannot go yet, or null. Money is required only when the goods are already in hand. */
export function cartProblem(lines: CartLine[], opts: { needCost: boolean; existingNames: string[] }): string | null {
  if (!lines.length) return 'Pick at least one item.';
  const taken = new Set(opts.existingNames.map((n) => n.trim().toLowerCase()));
  const seen = new Set<string>();
  for (const l of lines) {
    if (!(Number(l.qty) > 0)) return `Enter a quantity for ${l.name}.`;
    if (opts.needCost && (l.cost === '' || !(Number(l.cost) >= 0))) return `Enter the rate for ${l.name}.`;
    if (l.isNew) {
      const key = l.name.trim().toLowerCase();
      if (!key) return 'Give every new item a name.';
      if (taken.has(key)) return `${l.name} is already in your raw inventory. Pick it from the list.`;
      if (seen.has(key)) return `${l.name} is in the purchase twice.`;
      seen.add(key);
    }
  }
  return null;
}

export function toApiLines(lines: CartLine[]): PurchaseLine[] {
  return lines.map((l) => ({
    item_id: l.id, name: l.name.trim(), unit: l.unit, quantity: round3(Number(l.qty)), unit_cost: Math.round((Number(l.cost) || 0) * 100) / 100,
    ...(l.isNew ? { is_new: true, category: l.category || 'Raw stock' } : {}),
  }));
}

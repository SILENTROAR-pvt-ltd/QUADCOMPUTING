'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { StockItemView } from '@/lib/services/inventory/inventory.types';
import type { PurchaseLine } from '@/lib/services/inventory/purchase-message';
import type { Vendor } from './purchasing.types';

export interface DraftRow { item: StockItemView; on: boolean; qty: string; cost: string; onOrder: number; mine: boolean }

const same = (a?: string | null, b?: string | null) => Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * The order being built: every low item with its suggested quantity (less what is already on an
 * open order), ticked when it belongs to the chosen vendor or has no vendor yet. Any other stock
 * item can be added by hand.
 */
export function usePurchaseDraft(items: StockItemView[], onOrder: Map<string, number>, vendor: Vendor | null) {
  const [rows, setRows] = useState<Record<string, DraftRow>>({});
  const lastVendor = useRef<string | null | undefined>(undefined);

  // A new vendor starts a fresh draft; live stock updates only refresh the figures and add newly
  // low items, so quantities being typed are never wiped by a sale elsewhere.
  useEffect(() => {
    const fresh = lastVendor.current !== (vendor?.id ?? null);
    lastVendor.current = vendor?.id ?? null;
    setRows((prev) => {
      const next: Record<string, DraftRow> = {};
      const byId = new Map(items.map((i) => [i.id, i]));
      if (!fresh) for (const [id, r] of Object.entries(prev)) if (byId.has(id)) next[id] = { ...r, item: byId.get(id)!, onOrder: onOrder.get(id) || 0 };
      for (const item of items) {
        if (item.suggested_order <= 0 || next[item.id]) continue;
        const pending = onOrder.get(item.id) || 0;
        const need = round3(Math.max(0, item.suggested_order - pending));
        const mine = vendor ? same(item.supplier_name, vendor.name) : false;
        next[item.id] = {
          item, onOrder: pending, mine, qty: need ? String(need) : '', cost: item.cost_per_unit ? String(item.cost_per_unit) : '',
          on: need > 0 && (!vendor || mine || !item.supplier_name),
        };
      }
      return next;
    });
  }, [vendor, items, onOrder]);

  const update = (id: string, patch: Partial<DraftRow>) => setRows((r) => (r[id] ? { ...r, [id]: { ...r[id], ...patch } } : r));
  const addItem = (item: StockItemView) => setRows((r) => (r[item.id] ? { ...r, [item.id]: { ...r[item.id], on: true } } : {
    ...r, [item.id]: { item, on: true, qty: '', cost: item.cost_per_unit ? String(item.cost_per_unit) : '', onOrder: onOrder.get(item.id) || 0, mine: true },
  }));

  const list = useMemo(() => Object.values(rows).sort((a, b) => Number(b.mine) - Number(a.mine) || a.item.item_name.localeCompare(b.item.item_name)), [rows]);
  const lines: PurchaseLine[] = list
    .filter((r) => r.on && Number(r.qty) > 0)
    .map((r) => ({ item_id: r.item.id, name: r.item.item_name, unit: r.item.unit, quantity: round3(Number(r.qty)), unit_cost: Number(r.cost) || 0 }));
  const missingQty = list.filter((r) => r.on && !(Number(r.qty) > 0)).length;
  const total = lines.reduce((s, l) => s + l.quantity * l.unit_cost, 0);

  return { rows: list, lines, missingQty, total, update, addItem, reset: () => setRows({}) };
}

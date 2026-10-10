'use client';

import type { StockItemView } from '@/lib/services/inventory/inventory.types';
import { STATUS_STYLE, inr, qty } from '../inventory-format';
import type { DraftRow } from './usePurchaseDraft';

interface Props {
  rows: DraftRow[];
  items: StockItemView[];
  onUpdate: (id: string, patch: Partial<DraftRow>) => void;
  onAdd: (item: StockItemView) => void;
}

const num = 'h-9 w-full rounded-lg border border-neutral-200 bg-white px-2 text-right font-mono text-sm outline-none focus:border-neutral-900';

/** The lines of the order: tick, quantity and expected rate, with stock left and anything already on order. */
export function PurchaseDraftTable({ rows, items, onUpdate, onAdd }: Props) {
  const addable = items.filter((i) => !rows.some((r) => r.item.id === i.id));
  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">Nothing is low right now. Add any item below to order it anyway.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
          {rows.map((r) => {
            const s = STATUS_STYLE[r.item.status];
            return (
              <li key={r.item.id} className={`grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 p-3 sm:grid-cols-[auto_1fr_7rem_7rem_6rem] ${r.on ? '' : 'opacity-60'}`}>
                <input type="checkbox" checked={r.on} onChange={(e) => onUpdate(r.item.id, { on: e.target.checked })} aria-label={`Order ${r.item.item_name}`} className="h-4 w-4" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-950">{r.item.item_name}</p>
                  <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500">
                    <span className={`rounded px-1 py-0.5 font-semibold ring-1 ring-inset ${s.chip}`}>{qty(r.item.current_stock, r.item.unit)} left</span>
                    {r.onOrder > 0 && <span className="rounded bg-sky-50 px-1 py-0.5 font-semibold text-sky-800">{qty(r.onOrder, r.item.unit)} on order</span>}
                    {r.item.supplier_name && !r.mine && <span>usually from {r.item.supplier_name}</span>}
                  </p>
                </div>
                <label className="col-start-2 sm:col-start-auto"><span className="sr-only">Quantity</span>
                  <span className="relative block"><input type="number" min={0} step="any" inputMode="decimal" value={r.qty} onChange={(e) => onUpdate(r.item.id, { qty: e.target.value, on: true })} className={`${num} pr-10`} />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400">{r.item.unit}</span></span>
                </label>
                <label className="col-start-2 sm:col-start-auto"><span className="sr-only">Rate per {r.item.unit}</span>
                  <span className="relative block"><span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400">₹</span>
                    <input type="number" min={0} step="any" inputMode="decimal" value={r.cost} onChange={(e) => onUpdate(r.item.id, { cost: e.target.value })} className={`${num} pl-5`} /></span>
                </label>
                <p className="col-start-2 text-right font-mono text-sm text-neutral-900 sm:col-start-auto">{inr((Number(r.qty) || 0) * (Number(r.cost) || 0))}</p>
              </li>
            );
          })}
        </ul>
      )}
      {addable.length > 0 && (
        <label className="block">
          <span className="sr-only">Add another item</span>
          <select value="" onChange={(e) => { const it = addable.find((i) => i.id === e.target.value); if (it) onAdd(it); }}
            className="h-10 w-full rounded-xl border border-dashed border-neutral-300 bg-white px-3 text-sm text-neutral-600 outline-none focus:border-neutral-900 cursor-pointer">
            <option value="">+ Add another item to this order…</option>
            {addable.map((i) => <option key={i.id} value={i.id}>{i.item_name} ({qty(i.current_stock, i.unit)} left)</option>)}
          </select>
        </label>
      )}
    </div>
  );
}

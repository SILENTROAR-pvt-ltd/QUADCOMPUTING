'use client';

import { useMemo, useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import type { StockItemView, StockStatus } from '@/lib/services/inventory/inventory.types';
import { STATUS_STYLE, coverText, inr, qty } from './inventory-format';

type Filter = 'all' | 'attention' | 'tracked';

/** Every stock item: on hand against reorder level, how long it lasts, value, and recipe use. */
export function StockTable({ items, onOpen }: { items: StockItemView[]; onOpen: (item: StockItemView) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const order: Record<StockStatus, number> = { negative: 0, out: 1, low: 2, ok: 3 };

  const rows = useMemo(() => items
    .filter((i) => filter === 'all' || (filter === 'attention' ? i.status !== 'ok' : i.is_critical))
    .filter((i) => !query.trim() || [i.item_name, i.category, i.supplier_name].some((v) => String(v || '').toLowerCase().includes(query.trim().toLowerCase())))
    .sort((a, b) => order[a.status] - order[b.status] || a.item_name.localeCompare(b.item_name)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [items, query, filter]);
  const attention = items.filter((i) => i.status !== 'ok').length;

  return (
    <section aria-label="Stock" className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-neutral-200 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {([['all', `All ${items.length}`], ['attention', `Needs attention ${attention}`], ['tracked', 'Tracked']] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setFilter(id)}
              className={`h-9 shrink-0 rounded-xl border px-3 text-xs font-semibold cursor-pointer ${filter === id ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-600 hover:text-neutral-900'}`}>{label}</button>
          ))}
        </div>
        <label className="relative sm:w-64">
          <span className="sr-only">Search stock</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Item, category or supplier"
            className="h-9 w-full rounded-xl border border-neutral-200 pl-8 pr-3 text-xs outline-none focus:border-neutral-900" />
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="p-10 text-center text-sm text-neutral-500">{items.length ? 'No items match.' : 'No stock items yet.'}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-neutral-50 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">
              <tr>
                <th className="px-4 py-3">Item</th><th className="px-4 py-3">On hand</th><th className="px-4 py-3">Use / day</th>
                <th className="px-4 py-3">Lasts</th><th className="px-4 py-3 text-right">Avg cost</th><th className="px-4 py-3 text-right">Value</th><th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((i) => {
                const s = STATUS_STYLE[i.status];
                const fill = i.threshold > 0 ? Math.min(100, Math.max(3, (i.current_stock / (i.threshold * 2)) * 100)) : 100;
                return (
                  <tr key={i.id} onClick={() => onOpen(i)} className="cursor-pointer hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-neutral-950">{i.item_name}</p>
                      <p className="text-[11px] text-neutral-500">{i.category}{i.supplier_name ? ` · ${i.supplier_name}` : ''}{i.recipes ? ` · in ${i.recipes} recipe${i.recipes === 1 ? '' : 's'}` : ' · no recipe'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono tabular-nums ${i.status === 'ok' ? 'text-neutral-950' : 'font-semibold text-rose-700'}`}>{qty(i.current_stock, i.unit)}</span>
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${s.chip}`}>{s.label}</span>
                      </div>
                      <div className="mt-1.5 h-1 w-28 overflow-hidden rounded-full bg-neutral-100"><div className={`h-full ${s.bar}`} style={{ width: `${fill}%` }} /></div>
                      <p className="mt-1 text-[10px] text-neutral-500">Reorder at {qty(i.threshold, i.unit)}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-700">{i.daily_use ? qty(i.daily_use, i.unit) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-neutral-700">{coverText(i.days_cover) || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-neutral-700">{inr(i.cost_per_unit, 2)}</td>
                    <td className="px-4 py-3 text-right font-mono text-neutral-950">{inr(i.value)}</td>
                    <td className="pr-3 text-neutral-400"><ChevronRight className="h-4 w-4" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

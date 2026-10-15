'use client';

import { memo, useMemo, useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import type { StockItemView } from '@/lib/services/inventory/inventory.types';
import { qty, STATUS_STYLE } from '../inventory-format';
import type { CartLine } from './purchase-cart';

interface Props {
  items: StockItemView[];
  lines: CartLine[];
  onToggle: (item: StockItemView) => void;
  onRemoveNew: (id: string) => void;
  onNew: () => void;
}

const TILE = 'relative flex min-h-[96px] w-full flex-col justify-between rounded-2xl border p-3 text-left transition-[transform,background-color,border-color] cursor-pointer active:scale-[0.97]';

interface CubeProps { item: StockItemView; on: boolean; onToggle: (item: StockItemView) => void }

/** One raw item as a cube: tap to put it in the purchase, tap again to take it out. */
const Cube = memo(function Cube({ item, on, onToggle }: CubeProps) {
  const s = STATUS_STYLE[item.status];
  const needs = item.status !== 'ok';
  return (
    <button type="button" aria-pressed={on} onClick={() => onToggle(item)}
      className={`${TILE} [content-visibility:auto] [contain-intrinsic-size:auto_96px] ${on ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 bg-white text-neutral-950 hover:border-neutral-400'}`}>
      <span className={`absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full border ${on ? 'border-white bg-white text-neutral-950' : 'border-neutral-300 text-transparent'}`} aria-hidden>
        <Check className="h-3 w-3" />
      </span>
      <span className="line-clamp-2 pr-6 text-[14px] font-semibold leading-tight">{item.item_name}</span>
      <span className="mt-2 flex items-center justify-between gap-2">
        <span className={`text-[11px] ${on ? 'text-neutral-300' : 'text-neutral-500'}`}>{qty(item.current_stock, item.unit)} in stock</span>
        {needs && !on && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${s.chip}`}>{s.label}</span>}
      </span>
    </button>
  );
});

/** Every raw inventory item as cubes, with search and categories, and a cube to add an item that is not in stock yet. */
export function PurchaseCubes({ items, lines, onToggle, onRemoveNew, onNew }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const picked = useMemo(() => new Set(lines.map((l) => l.id)), [lines]);
  const categories = useMemo(() => ['All', ...Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort()], [items]);
  const needing = useMemo(() => items.filter((i) => i.status !== 'ok').length, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => (category === 'All' || i.category === category) && (!q || i.item_name.toLowerCase().includes(q)))
      // Out and low first: they are usually why a purchase is being made.
      .sort((a, b) => Number(a.status === 'ok') - Number(b.status === 'ok') || a.item_name.localeCompare(b.item_name));
  }, [items, query, category]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-neutral-400" aria-hidden />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search raw items" aria-label="Search raw items" maxLength={60}
          className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-3 text-[16px] outline-none focus:border-neutral-900 sm:text-sm" />
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Category">
        {categories.map((c) => (
          <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}
            className={`h-9 shrink-0 rounded-full border px-3.5 text-[12px] font-semibold cursor-pointer ${category === c ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 bg-white text-neutral-700'}`}>{c}</button>
        ))}
      </div>
      {needing > 0 && category === 'All' && !query && <p className="text-[11px] text-neutral-500">{needing} {needing === 1 ? 'item needs' : 'items need'} stock. They are shown first.</p>}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        <button type="button" onClick={onNew} className={`${TILE} items-start border-dashed border-neutral-400 bg-neutral-50 text-neutral-800 hover:bg-white`}>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-neutral-950 text-white"><Plus className="h-4 w-4" aria-hidden /></span>
          <span><span className="block text-[14px] font-semibold leading-tight">New item</span><span className="text-[11px] text-neutral-500">Not in stock yet</span></span>
        </button>

        {lines.filter((l) => l.isNew).map((l) => (
          <button key={l.id} type="button" aria-pressed onClick={() => onRemoveNew(l.id)} className={`${TILE} border-neutral-950 bg-neutral-950 text-white`}>
            <span className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-full bg-white text-neutral-950" aria-hidden><Check className="h-3 w-3" /></span>
            <span className="line-clamp-2 pr-6 text-[14px] font-semibold leading-tight">{l.name}</span>
            <span className="text-[11px] text-emerald-300">New · added on delivery</span>
          </button>
        ))}

        {visible.map((item) => <Cube key={item.id} item={item} on={picked.has(item.id)} onToggle={onToggle} />)}
      </div>

      {visible.length === 0 && <p className="rounded-2xl border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">No raw item matches. Use <strong>New item</strong> to add it to the purchase.</p>}
    </div>
  );
}

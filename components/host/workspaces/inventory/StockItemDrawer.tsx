'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { StockItemView } from '@/lib/services/inventory/inventory.types';
import { MovementForm, type FormType } from './MovementForm';
import { ItemDetailsForm } from './ItemDetailsForm';
import { MovementsLedger } from './MovementsLedger';
import { STATUS_STYLE, coverText, inr, qty } from './inventory-format';

interface Props {
  item: StockItemView | null;
  items: StockItemView[];
  version: number;
  initialType?: FormType;
  onClose: () => void;
  onChanged: (message: string) => void;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-500">{label}</p>
      <p className="mt-0.5 font-mono text-sm tabular-nums text-neutral-950">{value}</p>
    </div>
  );
}

/** One stock item: where it stands, record a movement, edit details, and its stock card. */
export function StockItemDrawer({ item, items, version, initialType, onClose, onChanged }: Props) {
  const [tab, setTab] = useState<'move' | 'details'>('move');
  useEffect(() => { setTab('move'); }, [item?.id]);
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, onClose]);
  if (!item) return null;
  const s = STATUS_STYLE[item.status];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-neutral-950/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={item.item_name} onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        <header className="flex items-start justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate font-serif text-2xl text-neutral-950">{item.item_name}</h2>
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${s.chip}`}>{s.label}</span>
            </div>
            <p className="mt-0.5 text-xs text-neutral-500">{item.category}{item.supplier_name ? ` · ${item.supplier_name}` : ''}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="grid grid-cols-3 gap-2">
            <Fact label="On hand" value={qty(item.current_stock, item.unit)} />
            <Fact label="Reorder at" value={qty(item.threshold, item.unit)} />
            <Fact label="Value" value={inr(item.value)} />
            <Fact label="Avg cost" value={`${inr(item.cost_per_unit, 2)}/${item.unit}`} />
            <Fact label="Use / day" value={item.daily_use ? qty(item.daily_use, item.unit) : '—'} />
            <Fact label="Lasts" value={coverText(item.days_cover) || '—'} />
          </div>
          {item.recipes === 0 && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              No menu recipe uses this item, so sales do not reduce it. Link it from Menu Catalog → recipe.
            </p>
          )}
          {item.suggested_order > 0 && (
            <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">Suggested order: {qty(item.suggested_order, item.unit)} (about two weeks of use).</p>
          )}

          <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1">
            {([['move', 'Record movement'], ['details', 'Details']] as const).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`h-9 rounded-lg text-xs font-semibold cursor-pointer ${tab === id ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'}`}>{label}</button>
            ))}
          </div>
          {tab === 'move'
            ? <MovementForm key={`${item.id}-${initialType || ''}`} items={items} item={item} initialType={initialType} onDone={onChanged} />
            : <ItemDetailsForm key={item.id} item={item} onSaved={onChanged} />}

          <div>
            <h3 className="mb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">Stock card</h3>
            <div className="rounded-xl border border-neutral-200"><MovementsLedger itemId={item.id} version={version} compact /></div>
          </div>
        </div>
      </aside>
    </div>
  );
}

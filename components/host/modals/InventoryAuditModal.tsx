'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { StockItemView } from '@/lib/services/inventory/inventory.types';
import { inr, qty } from '@/components/host/workspaces/inventory/inventory-format';

interface InventoryAuditModalProps {
  items: StockItemView[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}

/**
 * Physical stock count. Shows each item's variance and its value as counts are typed; the
 * server records the variance against the stock at the moment of saving.
 */
export function InventoryAuditModal({ items, onClose, onSuccess }: InventoryAuditModalProps) {
  const [scope, setScope] = useState<'tracked' | 'all'>(items.some((i) => i.is_critical) ? 'tracked' : 'all');
  const [query, setQuery] = useState('');
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const list = useMemo(() => items
    .filter((i) => scope === 'all' || i.is_critical)
    .filter((i) => !query.trim() || i.item_name.toLowerCase().includes(query.trim().toLowerCase())), [items, scope, query]);
  const entered = items.filter((i) => counts[i.id] !== undefined && counts[i.id] !== '' && Number.isFinite(Number(counts[i.id])));
  const varianceValue = entered.reduce((s, i) => s + (Number(counts[i.id]) - i.current_stock) * i.cost_per_unit, 0);

  const submit = async () => {
    if (entered.length === 0) { setError('Enter at least one counted quantity.'); return; }
    setBusy(true); setError(null);
    const audits = entered.map((i) => ({ raw_item_id: i.id, physical_stock: Number(counts[i.id]) }));
    const res = await fetch('/api/host/inventory/audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audits }) }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) { setError(json.error || json.message || 'No connection. The count was not saved.'); return; }
    onSuccess(json.failed ? json.message : `Count saved for ${json.counted} item${json.counted === 1 ? '' : 's'}.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/30 p-3 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Stock count" onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-neutral-200 px-6 py-4">
          <div>
            <h2 className="font-serif text-2xl text-neutral-950">Stock count</h2>
            <p className="text-xs text-neutral-500">Count what is on the shelf. Leave an item blank to skip it.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 cursor-pointer"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex flex-col gap-2 border-b border-neutral-200 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex gap-1 rounded-xl bg-neutral-100 p-1">
            {([['tracked', 'High-value items'], ['all', 'All items']] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setScope(id)}
                className={`h-8 rounded-lg px-3 text-xs font-semibold cursor-pointer ${scope === id ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'}`}>{label}</button>
            ))}
          </div>
          <label className="relative sm:w-56">
            <span className="sr-only">Find item</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find item" className="h-9 w-full rounded-xl border border-neutral-200 pl-8 pr-3 text-xs outline-none focus:border-neutral-900" />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-2">
          {list.length === 0 ? <p className="py-10 text-center text-sm text-neutral-500">{scope === 'tracked' ? 'No high-value items yet. Mark items in their details, or count all items.' : 'No items.'}</p> : (
            <ul className="divide-y divide-neutral-100">
              {list.map((i) => {
                const v = counts[i.id];
                const has = v !== undefined && v !== '' && Number.isFinite(Number(v));
                const diff = has ? Number(v) - i.current_stock : 0;
                return (
                  <li key={i.id} className="grid grid-cols-[1fr_7rem_7.5rem] items-center gap-3 py-2.5 text-sm">
                    <div className="min-w-0"><p className="truncate font-medium text-neutral-950">{i.item_name}</p><p className="text-[11px] text-neutral-500">System {qty(i.current_stock, i.unit)}</p></div>
                    <input type="number" step="any" min={0} inputMode="decimal" aria-label={`Counted ${i.item_name}`} value={v ?? ''} placeholder={i.unit}
                      onChange={(e) => setCounts((c) => ({ ...c, [i.id]: e.target.value }))} className="h-9 rounded-lg border border-neutral-200 px-2 text-right font-mono outline-none focus:border-neutral-900" />
                    <p className={`text-right text-xs ${!has ? 'text-neutral-400' : diff === 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-sky-700'}`}>
                      {!has ? '—' : diff === 0 ? 'Matches' : <>{diff > 0 ? '+' : ''}{qty(diff, i.unit)}<span className="block text-[10px]">{inr(diff * i.cost_per_unit)}</span></>}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex flex-col gap-3 border-t border-neutral-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-600">{entered.length} counted · variance <span className={varianceValue < 0 ? 'font-semibold text-rose-700' : 'font-semibold text-neutral-900'}>{inr(varianceValue)}</span></p>
          {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
          <button type="button" onClick={submit} disabled={busy || entered.length === 0}
            className="h-10 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40 cursor-pointer">{busy ? 'Saving…' : 'Save count'}</button>
        </footer>
      </div>
    </div>
  );
}

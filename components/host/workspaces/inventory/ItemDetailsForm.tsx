'use client';

import { useState } from 'react';
import type { StockItemView } from '@/lib/services/inventory/inventory.types';

const field = 'h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-900';
const label = 'mb-1 block text-[11px] font-semibold text-neutral-600';

/** Name, category, reorder level, preferred supplier and tracking. Quantity changes go through movements. */
export function ItemDetailsForm({ item, onSaved }: { item: StockItemView; onSaved: (msg: string) => void }) {
  const [name, setName] = useState(item.item_name);
  const [category, setCategory] = useState(item.category);
  const [threshold, setThreshold] = useState(String(item.threshold));
  const [supplier, setSupplier] = useState(item.supplier_name || '');
  const [tracked, setTracked] = useState(item.is_critical);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch('/api/host/inventory/items', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, item_name: name, category, threshold: Number(threshold), supplier_name: supplier, is_critical: tracked }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) { setError(json.error || 'No connection. Nothing was saved.'); return; }
    onSaved(`${name} updated.`);
  };

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className={label}>Name</span><input value={name} onChange={(e) => setName(e.target.value)} required className={field} /></label>
        <label className="block"><span className={label}>Category</span><input value={category} onChange={(e) => setCategory(e.target.value)} className={field} /></label>
        <label className="block"><span className={label}>Reorder at ({item.unit})</span>
          <input type="number" step="any" min={0} value={threshold} onChange={(e) => setThreshold(e.target.value)} className={`${field} font-mono`} /></label>
        <label className="block"><span className={label}>Preferred supplier</span><input value={supplier} onChange={(e) => setSupplier(e.target.value)} className={field} /></label>
      </div>
      <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
        <input type="checkbox" checked={tracked} onChange={(e) => setTracked(e.target.checked)} className="h-4 w-4" />
        High-value item: include in quick daily counts
      </label>
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p>}
      <button type="submit" disabled={busy} className="h-10 w-full rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-900 hover:bg-neutral-50 disabled:opacity-50 cursor-pointer">
        {busy ? 'Saving…' : 'Save details'}
      </button>
    </form>
  );
}

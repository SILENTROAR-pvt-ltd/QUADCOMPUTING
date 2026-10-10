'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { BatchIngestItem } from './raw-stock.types';
import { INVENTORY_CATEGORIES, INVENTORY_UNITS } from './raw-stock.constants';

interface StockCustomItemFormProps {
  batchLength: number;
  onAddCustomItem: (item: BatchIngestItem) => void;
  onError: (msg: string | null) => void;
}

const field = 'h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-900';
const lbl = 'mb-1 block text-[11px] font-semibold text-neutral-600';
const BLANK = { name: '', category: INVENTORY_CATEGORIES[0], unit: 'kg', stock: '', cost: '', threshold: '5', critical: false };

/** An item that is not in the common list: name, unit, opening quantity, cost and reorder level. */
export function StockCustomItemForm({ batchLength, onAddCustomItem, onError }: StockCustomItemFormProps) {
  const [f, setF] = useState(BLANK);
  const [open, setOpen] = useState(false);
  const set = (k: keyof typeof BLANK) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));
  const shown = open || batchLength === 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = f.name.trim();
    if (!name) return onError('Give the item a name.');
    if (!(parseFloat(f.stock) >= 0)) return onError('Opening quantity must be 0 or more.');
    if (!(parseFloat(f.cost) >= 0)) return onError('Cost must be 0 or more.');
    onAddCustomItem({
      id: `custom_${Date.now()}`, name, category: f.category, unit: f.unit, icon: '📦',
      quantity: f.stock, costPerUnit: f.cost, threshold: f.threshold || '5', isCritical: f.critical,
    });
    setF(BLANK); setOpen(false); onError(null);
  };

  return (
    <section className="rounded-2xl border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">Your own item</h3>
        {batchLength > 0 && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-semibold text-neutral-700 hover:text-neutral-950 cursor-pointer">{shown ? 'Hide' : 'Add another'}</button>
        )}
      </div>
      {shown && (
        <form onSubmit={submit} className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className={lbl}>Name</span><input required value={f.name} onChange={set('name')} className={field} placeholder="e.g. Paneer, Basmati rice" /></label>
            <label className="block"><span className={lbl}>Category</span>
              <select value={f.category} onChange={set('category')} className={field}>{INVENTORY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="block"><span className={lbl}>Unit</span>
              <select value={f.unit} onChange={set('unit')} className={field}>{INVENTORY_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}</select></label>
            <label className="block"><span className={lbl}>Opening ({f.unit})</span><input required type="number" min={0} step="any" value={f.stock} onChange={set('stock')} className={`${field} font-mono`} /></label>
            <label className="block"><span className={lbl}>Cost / {f.unit} (₹)</span><input required type="number" min={0} step="any" value={f.cost} onChange={set('cost')} className={`${field} font-mono`} /></label>
            <label className="block"><span className={lbl}>Reorder at</span><input type="number" min={0} step="any" value={f.threshold} onChange={set('threshold')} className={`${field} font-mono`} /></label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
              <input type="checkbox" checked={f.critical} onChange={set('critical')} className="h-4 w-4" /> High-value: include in quick daily counts
            </label>
            <button type="submit" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-900 hover:bg-neutral-50 cursor-pointer">
              <Plus className="h-4 w-4" /> Add to list
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

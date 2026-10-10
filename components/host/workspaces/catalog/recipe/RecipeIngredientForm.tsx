'use client';

import React, { useState } from 'react';
import type { RawItem } from './recipe-types';
import { enteredLabel, usesSmallUnits } from './recipe-units';

interface RecipeIngredientFormProps {
  rawItems: RawItem[];
  taken: Set<string>;
  /** Adds the ingredient. Returns a message when it cannot be added. */
  onAdd: (raw: RawItem, entered: number) => string | null;
}

const field = 'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10';

/** Pick a raw material and how much one portion uses. Every raw material is listed. */
export function RecipeIngredientForm({ rawItems, taken, onAdd }: RecipeIngredientFormProps) {
  const [rawId, setRawId] = useState('');
  const [qty, setQty] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const raw = rawItems.find((r) => r.id === rawId);
  const available = rawItems.filter((r) => !taken.has(r.id));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = Number(qty);
    if (!raw) return setMessage('Choose a raw material.');
    if (!Number.isFinite(entered) || entered <= 0) return setMessage('Enter a quantity above zero.');
    const problem = onAdd(raw, entered);
    if (problem) return setMessage(problem);
    setRawId('');
    setQty('');
    setMessage(null);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-[1fr_auto] gap-3 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
        <label className="col-span-2 sm:col-span-1">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Raw material</span>
          <select value={rawId} onChange={(e) => { setRawId(e.target.value); setMessage(null); }} className={field}>
            <option value="">Select a raw material…</option>
            {available.map((r) => (
              <option key={r.id} value={r.id}>
                {r.item_name} ({r.unit}){r.is_critical ? '' : ' · not tracked'}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            {raw ? enteredLabel(raw.unit) : 'Quantity'}
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={qty}
            onChange={(e) => { setQty(e.target.value); setMessage(null); }}
            placeholder={raw && usesSmallUnits(raw.unit) ? 'e.g. 250' : 'e.g. 1'}
            className={field}
          />
        </label>
        <button type="submit" className="col-span-2 h-[42px] rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 sm:col-span-1 cursor-pointer">
          Add
        </button>
      </div>
      {message && <p role="alert" className="text-xs font-medium text-rose-700">{message}</p>}
      {raw && !raw.is_critical && (
        <p className="text-[11px] text-zinc-500">
          {raw.item_name} isn&apos;t tracked in Raw Inventory yet. It still deducts from stock when a dish sells.
        </p>
      )}
    </form>
  );
}

export default RecipeIngredientForm;

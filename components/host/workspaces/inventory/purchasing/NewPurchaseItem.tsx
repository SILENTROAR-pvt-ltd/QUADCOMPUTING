'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { UNITS } from '@/lib/services/inventory/item-input';
import { lineFromNew, type CartLine } from './purchase-cart';

interface Props {
  categories: string[];
  onAdd: (line: CartLine) => void;
  onBack: () => void;
}

const field = 'h-12 w-full rounded-xl border border-neutral-200 bg-white px-3 text-[16px] outline-none focus:border-neutral-900 sm:text-sm';
const label = 'mb-1 block text-[11px] font-semibold text-neutral-600';

/** An item that is not in raw inventory yet: its details are filled in here, and it is added to stock when it is received. */
export function NewPurchaseItem({ categories, onAdd, onBack }: Props) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('kg');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Give the item a name.');
    if (!(Number(quantity) > 0)) return setError('Enter how much you are buying.');
    onAdd(lineFromNew({ name, unit, category, qty: quantity, cost }));
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <button type="button" onClick={onBack} className="-ml-1 inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl px-2 text-[13px] font-semibold text-neutral-600 active:bg-neutral-100">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to items
      </button>
      <div>
        <h3 className="font-serif text-xl text-neutral-950">New item</h3>
        <p className="text-xs text-neutral-500">It is added to your raw inventory when the delivery is received.</p>
      </div>

      <label className="block"><span className={label}>Item name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus placeholder="e.g. Saffron" className={field} /></label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className={label}>Unit</span>
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className={field}>{UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select></label>
        <label className="block"><span className={label}>Category</span>
          <input value={category} onChange={(e) => setCategory(e.target.value)} list="purchase-categories" maxLength={40} placeholder="Raw stock" className={field} />
          <datalist id="purchase-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist></label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className={label}>Quantity ({unit})</span>
          <input type="number" step="any" min={0} inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`${field} font-mono`} /></label>
        <label className="block"><span className={label}>Rate per {unit} (₹)</span>
          <input type="number" step="any" min={0} inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Optional" className={`${field} font-mono`} /></label>
      </div>

      {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p>}
      <button type="submit" className="h-12 w-full cursor-pointer rounded-2xl bg-neutral-950 text-[14px] font-semibold text-white active:scale-[0.99]">Add to purchase</button>
    </form>
  );
}

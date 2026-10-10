'use client';

import { useEffect, useState } from 'react';
import type { StockItemView } from '@/lib/services/inventory/inventory.types';
import { inr, qty } from './inventory-format';

export type FormType = 'PURCHASE' | 'WASTAGE' | 'ADJUSTMENT' | 'COUNT';
const TYPES: Array<{ id: FormType; label: string }> = [
  { id: 'PURCHASE', label: 'Purchase' }, { id: 'WASTAGE', label: 'Wastage' }, { id: 'COUNT', label: 'Count' }, { id: 'ADJUSTMENT', label: 'Adjust' },
];
const WASTE_REASONS = ['Spoiled', 'Expired', 'Spilled', 'Burnt / kitchen error', 'Returned by guest'];
const field = 'h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-900';
const label = 'mb-1 block text-[11px] font-semibold text-neutral-600';

interface Props {
  items: StockItemView[];
  item?: StockItemView | null;
  initialType?: FormType;
  onDone: (message: string) => void;
}

/** Records a purchase, wastage, physical count or adjustment for one item through the stock ledger. */
export function MovementForm({ items, item, initialType = 'PURCHASE', onDone }: Props) {
  const [type, setType] = useState<FormType>(initialType);
  const [itemId, setItemId] = useState(item?.id || '');
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [supplier, setSupplier] = useState('');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState(WASTE_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const target = item || items.find((i) => i.id === itemId) || null;

  useEffect(() => {
    setCost(target ? String(target.cost_per_unit || '') : ''); setSupplier(target?.supplier_name || '');
  }, [target?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = Number(quantity);
  const preview = !target || !quantity || !Number.isFinite(q) ? null
    : type === 'COUNT' ? `Variance ${q - target.current_stock >= 0 ? '+' : ''}${qty(q - target.current_stock, target.unit)} (${inr(Math.abs(q - target.current_stock) * target.cost_per_unit)})`
    : type === 'PURCHASE' ? `Stock becomes ${qty(target.current_stock + q, target.unit)} · bill ${inr(q * (Number(cost) || 0), 2)}`
    : `Stock becomes ${qty(target.current_stock + (type === 'WASTAGE' ? -q : q), target.unit)}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) { setError('Choose an item.'); return; }
    setBusy(true); setError(null);
    const body = {
      item_id: target.id, type, quantity: q,
      unit_cost: type === 'PURCHASE' ? Number(cost) : undefined,
      supplier: type === 'PURCHASE' ? supplier : undefined, reference: type === 'PURCHASE' ? reference : undefined,
      notes: type === 'WASTAGE' ? [reason, notes].filter(Boolean).join(' · ') : notes,
    };
    const res = await fetch('/api/host/inventory/movements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) { setError(json.error || 'No connection. Nothing was saved.'); return; }
    setQuantity(''); setReference(''); setNotes('');
    onDone(`${TYPES.find((t) => t.id === type)!.label} saved · ${target.item_name} now ${qty(json.stock_after, target.unit)}`);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div role="tablist" className="grid grid-cols-4 gap-1 rounded-xl bg-neutral-100 p-1">
        {TYPES.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={type === t.id} onClick={() => { setType(t.id); setError(null); }}
            className={`h-8 rounded-lg text-xs font-semibold cursor-pointer ${type === t.id ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`}>{t.label}</button>
        ))}
      </div>
      {!item && (
        <label className="block"><span className={label}>Item</span>
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} className={field} required>
            <option value="">Choose an item…</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.item_name} ({qty(i.current_stock, i.unit)})</option>)}
          </select>
        </label>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className={label}>{type === 'COUNT' ? 'Counted quantity' : type === 'ADJUSTMENT' ? 'Add (+) or remove (−)' : 'Quantity'}{target ? ` (${target.unit})` : ''}</span>
          <input type="number" step="any" inputMode="decimal" required value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`${field} font-mono`} /></label>
        {type === 'PURCHASE' && <label className="block"><span className={label}>Cost per {target?.unit || 'unit'} (₹)</span>
          <input type="number" step="any" min={0} inputMode="decimal" required value={cost} onChange={(e) => setCost(e.target.value)} className={`${field} font-mono`} /></label>}
        {type === 'WASTAGE' && <label className="block"><span className={label}>Reason</span>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className={field}>{WASTE_REASONS.map((r) => <option key={r}>{r}</option>)}</select></label>}
      </div>
      {type === 'PURCHASE' && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className={label}>Supplier</span><input value={supplier} onChange={(e) => setSupplier(e.target.value)} className={field} placeholder="e.g. Metro" /></label>
          <label className="block"><span className={label}>Bill / invoice no.</span><input value={reference} onChange={(e) => setReference(e.target.value)} className={field} placeholder="Optional" /></label>
        </div>
      )}
      <label className="block"><span className={label}>Note</span><input value={notes} onChange={(e) => setNotes(e.target.value)} className={field} placeholder="Optional" /></label>
      {preview && <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-700">{preview}</p>}
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p>}
      <button type="submit" disabled={busy} className="h-11 w-full rounded-xl bg-neutral-950 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 cursor-pointer">
        {busy ? 'Saving…' : `Save ${TYPES.find((t) => t.id === type)!.label.toLowerCase()}`}
      </button>
    </form>
  );
}

'use client';

import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { displayPhone } from '@/lib/services/inventory/purchase-message';
import type { Vendor } from './purchasing.types';

interface Props {
  vendors: Vendor[];
  value: string;
  onChange: (id: string) => void;
  onSave: (name: string, phone: string) => Promise<Vendor>;
}

const field = 'h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-900';

/** Choose the vendor to order from, add a new one, or fix a vendor's WhatsApp number. */
export function VendorPicker({ vendors, value, onChange, onSave }: Props) {
  const selected = vendors.find((v) => v.id === value) || null;
  const [mode, setMode] = useState<'pick' | 'new' | 'edit'>(vendors.length ? 'pick' : 'new');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = (m: 'new' | 'edit') => {
    setMode(m); setError(null);
    setName(m === 'edit' ? selected?.name || '' : ''); setPhone(m === 'edit' ? selected?.phone || '' : '');
  };
  const save = async () => {
    setBusy(true); setError(null);
    try {
      const v = await onSave(name, phone);
      onChange(v.id); setMode('pick');
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  if (mode !== 'pick') {
    return (
      <div className="space-y-2 rounded-2xl border border-neutral-200 bg-neutral-50/60 p-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">{mode === 'new' ? 'New vendor' : `Edit ${selected?.name}`}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input aria-label="Vendor name" value={name} onChange={(e) => setName(e.target.value)} disabled={mode === 'edit'} placeholder="Vendor name, e.g. Sharma Dairy" className={field} />
          <input aria-label="WhatsApp number" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp number, e.g. 98765 43210" className={field} />
        </div>
        {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2">
          {vendors.length > 0 && <button type="button" onClick={() => setMode('pick')} className="h-9 rounded-xl px-3 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 cursor-pointer">Cancel</button>}
          <button type="button" onClick={save} disabled={busy || !name.trim()} className="h-9 rounded-xl bg-neutral-950 px-4 text-xs font-semibold text-white disabled:opacity-40 cursor-pointer">{busy ? 'Saving…' : 'Save vendor'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label className="flex-1">
        <span className="sr-only">Vendor</span>
        <select value={value} onChange={(e) => onChange(e.target.value)} className={field}>
          <option value="">Choose a vendor…</option>
          {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}{v.phone ? ` · ${displayPhone(v.phone)}` : ' · no number'}</option>)}
        </select>
      </label>
      {selected && (
        <button type="button" onClick={() => start('edit')} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-neutral-200 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer">
          <Pencil className="h-3.5 w-3.5" /> {selected.phone ? 'Number' : 'Add number'}
        </button>
      )}
      <button type="button" onClick={() => start('new')} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-neutral-200 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer">
        <Plus className="h-3.5 w-3.5" /> New vendor
      </button>
    </div>
  );
}

'use client';

import { Minus, Plus, X } from 'lucide-react';
import { inr } from '../inventory-format';
import type { Vendor } from './purchasing.types';
import { VendorPicker } from './VendorPicker';
import { lineTotal, type CartLine } from './purchase-cart';

interface Props {
  lines: CartLine[];
  vendors: Vendor[];
  vendorId: string;
  note: string;
  onPatch: (id: string, patch: Partial<CartLine>) => void;
  onRemove: (id: string) => void;
  onVendor: (id: string) => void;
  onNote: (v: string) => void;
  onSaveVendor: (name: string, phone: string) => Promise<Vendor>;
}

const input = 'h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-right font-mono text-[16px] outline-none focus:border-neutral-900 sm:text-sm';
const step = (unit: string) => (['kg', 'ltr'].includes(unit) ? 0.5 : 1);

/** The chosen items with their quantities and rates, who they are from, and a note. */
export function PurchaseReview({ lines, vendors, vendorId, note, onPatch, onRemove, onVendor, onNote, onSaveVendor }: Props) {
  const bump = (l: CartLine, dir: 1 | -1) => {
    const next = Math.max(0, Math.round(((Number(l.qty) || 0) + dir * step(l.unit)) * 1000) / 1000);
    onPatch(l.id, { qty: next ? String(next) : '' });
  };
  return (
    <div className="space-y-4">
      <ul className="space-y-2.5">
        {lines.map((l) => (
          <li key={l.id} className="rounded-2xl border border-neutral-200 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-neutral-950">{l.name}</p>
                <p className="text-[11px] text-neutral-500">
                  {l.isNew ? <span className="font-semibold text-emerald-700">New item · added to stock on delivery</span> : `${l.stock ?? 0} ${l.unit} in stock`}
                </p>
              </div>
              <button type="button" onClick={() => onRemove(l.id)} aria-label={`Remove ${l.name}`} className="-mr-1 -mt-1 grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-neutral-400 active:bg-neutral-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-2 grid grid-cols-[1fr_1fr] gap-2">
              <div>
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Quantity ({l.unit})</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => bump(l, -1)} aria-label={`Less ${l.name}`} className="grid h-11 w-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-neutral-200 active:bg-neutral-100"><Minus className="h-4 w-4" /></button>
                  <input type="number" step="any" min={0} inputMode="decimal" value={l.qty} onChange={(e) => onPatch(l.id, { qty: e.target.value })} aria-label={`Quantity of ${l.name}`} className={`${input} min-w-0 text-center`} />
                  <button type="button" onClick={() => bump(l, 1)} aria-label={`More ${l.name}`} className="grid h-11 w-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-neutral-200 active:bg-neutral-100"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
              <label>
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Rate per {l.unit} (₹)</span>
                <input type="number" step="any" min={0} inputMode="decimal" value={l.cost} onChange={(e) => onPatch(l.id, { cost: e.target.value })} placeholder="0" className={input} />
              </label>
            </div>
            {lineTotal(l) > 0 && <p className="mt-1.5 text-right text-[11px] text-neutral-500">Line total <span className="font-mono font-semibold text-neutral-900">{inr(lineTotal(l), 2)}</span></p>}
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Vendor</p>
        <VendorPicker vendors={vendors} value={vendorId} onChange={onVendor} onSave={onSaveVendor} />
      </div>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-neutral-600">Note for the vendor</span>
        <input value={note} onChange={(e) => onNote(e.target.value)} maxLength={240} placeholder="e.g. Deliver before 10 am tomorrow"
          className="h-11 w-full rounded-xl border border-neutral-200 px-3 text-[16px] outline-none focus:border-neutral-900 sm:text-sm" />
      </label>
    </div>
  );
}

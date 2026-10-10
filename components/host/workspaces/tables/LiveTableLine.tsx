'use client';

import React from 'react';
import { CheckCircle2, ChefHat, Clock, Loader2, Trash2 } from 'lucide-react';

export interface BillLine {
  id: string;
  item_name: string;
  price: number;
  quantity: number;
  notes?: string | null;
  kot_status?: string | null;
}

export const KITCHEN_STATUS: Record<string, { label: string; chip: string }> = {
  pending: { label: 'Waiting', chip: 'bg-neutral-100 text-neutral-700' },
  preparing: { label: 'Cooking', chip: 'bg-sky-100 text-sky-900' },
  cooking: { label: 'Cooking', chip: 'bg-sky-100 text-sky-900' },
  ready: { label: 'Ready', chip: 'bg-emerald-100 text-emerald-900' },
  served: { label: 'Served', chip: 'bg-neutral-200 text-neutral-700' },
};

export const inr = (n: number) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

interface LiveTableLineProps {
  line: BillLine;
  confirming: boolean;
  removing: boolean;
  onAskRemove: () => void;
  onConfirmRemove: () => void;
  onKeep: () => void;
  /** Sets a pending line's quantity. Only offered while the kitchen has not started the line. */
  onQuantity?: (quantity: number) => void;
}

/** One line of a live bill: what it is, where the kitchen has got to, and changing or removing it while it is still pending. */
export function LiveTableLine({ line, confirming, removing, onAskRemove, onConfirmRemove, onKeep, onQuantity }: LiveTableLineProps) {
  const status = (line.kot_status || 'pending').toLowerCase();
  const k = KITCHEN_STATUS[status] ?? KITCHEN_STATUS.pending;
  const canRemove = status === 'pending';
  return (
    <li className="flex items-start gap-3 py-3">
      {canRemove && onQuantity ? (
        <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-neutral-200" aria-label={`Quantity of ${line.item_name}`}>
          <button type="button" onClick={() => onQuantity(line.quantity - 1)} disabled={line.quantity <= 1 || removing} aria-label={`One less ${line.item_name}`} className="flex h-7 w-7 items-center justify-center text-neutral-700 hover:bg-neutral-50 disabled:opacity-30 cursor-pointer">−</button>
          <span className="w-7 text-center font-mono text-xs font-bold text-neutral-950">{line.quantity}</span>
          <button type="button" onClick={() => onQuantity(line.quantity + 1)} disabled={line.quantity >= 50 || removing} aria-label={`One more ${line.item_name}`} className="flex h-7 w-7 items-center justify-center text-neutral-700 hover:bg-neutral-50 disabled:opacity-30 cursor-pointer">+</button>
        </div>
      ) : (
        <span className="flex h-7 min-w-[1.75rem] shrink-0 items-center justify-center rounded-lg bg-neutral-950 px-1.5 font-mono text-xs font-bold text-white">
          {line.quantity}×
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-neutral-950">{line.item_name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500">
          <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold ${k.chip}`}>
            {status === 'served' ? <CheckCircle2 className="h-3 w-3" /> : <ChefHat className="h-3 w-3" />} {k.label}
          </span>
          <span className="font-mono">{inr(line.price)} each</span>
        </p>
        {line.notes && <p className="mt-1 text-[11px] text-amber-800">{line.notes}</p>}
      </div>
      <div className="shrink-0 text-right">
        <p className="font-mono text-sm font-bold text-neutral-950">{inr(Number(line.price) * Number(line.quantity))}</p>
        {canRemove && !confirming && (
          <button type="button" onClick={onAskRemove} className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-rose-600 hover:underline">
            <Trash2 className="h-3 w-3" /> Remove
          </button>
        )}
        {canRemove && confirming && (
          <div className="mt-1 flex flex-col items-end gap-1">
            <button type="button" onClick={onConfirmRemove} disabled={removing} className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50">
              {removing && <Loader2 className="h-3 w-3 animate-spin" />} Remove {line.item_name}
            </button>
            <button type="button" onClick={onKeep} className="cursor-pointer text-[11px] text-neutral-500 hover:underline">Keep</button>
          </div>
        )}
        {!canRemove && <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-neutral-400"><Clock className="h-3 w-3" /> started</p>}
      </div>
    </li>
  );
}

export default LiveTableLine;

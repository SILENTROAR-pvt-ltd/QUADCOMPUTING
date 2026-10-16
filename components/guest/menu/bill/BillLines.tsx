import React from 'react';
import type { BillLine } from './normalize-bill-items';

/** The bill's dishes, one per row with quantity, unit price, note and line total; or a quiet note when there are none yet. */
export function BillLines({ lines }: { lines: BillLine[] }) {
  if (lines.length === 0) {
    return (
      <div className="space-y-1 py-10 text-center">
        <p className="text-sm font-medium text-zinc-600">No active items on bill yet</p>
        <p className="text-xs font-light text-zinc-400">Dishes sent to kitchen will appear here automatically.</p>
      </div>
    );
  }
  return (
    <div className="divide-y divide-zinc-100">
      {lines.map((it) => (
        <div key={it.id} className="flex items-start justify-between gap-3 py-3.5 text-xs">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-zinc-900">{it.quantity}× {it.itemName}</span>
              {it.quantity > 1 && <span className="font-mono text-[10px] text-zinc-400">(@ ₹{it.unitPrice.toFixed(0)})</span>}
            </div>
            {it.notes && <p className="mt-0.5 text-[11px] font-light text-zinc-400">Note: {it.notes}</p>}
          </div>
          <span className="shrink-0 font-mono text-sm font-bold text-zinc-900">₹{it.lineTotal.toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
}

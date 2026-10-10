'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { StockItemView } from '@/lib/services/inventory/inventory.types';
import { MovementForm } from './MovementForm';

/** Record a delivery (or wastage, count, adjustment) for any item without opening it first. */
export function PurchaseSheet({ items, onClose, onDone }: { items: StockItemView[]; onClose: () => void; onDone: (msg: string) => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/30 p-3 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Record stock movement" onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-serif text-2xl text-neutral-950">Record stock</h2>
            <p className="text-xs text-neutral-500">Purchases update the average cost; every entry lands on the item&apos;s stock card.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 cursor-pointer"><X className="h-5 w-5" /></button>
        </div>
        {items.length === 0
          ? <p className="py-6 text-center text-sm text-neutral-500">Add a stock item first.</p>
          : <MovementForm items={items} onDone={(m) => { onDone(m); onClose(); }} />}
      </div>
    </div>
  );
}

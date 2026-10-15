'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { inr } from '../inventory-format';
import type { PurchaseOrder } from './purchasing.types';
import type { PurchaseLine } from '@/lib/services/inventory/purchase-message';

interface Props {
  order: PurchaseOrder;
  onClose: () => void;
  onReceive: (id: string, lines: PurchaseLine[]) => Promise<{ received: number; failed: string[] }>;
  onDone: (msg: string) => void;
}

const num = 'h-11 w-full rounded-xl border border-neutral-200 px-2 text-right font-mono text-[16px] outline-none focus:border-neutral-900 sm:text-sm';

/** Book a delivery into stock: what actually arrived and at what rate (from the vendor's bill). */
export function ReceiveOrderSheet({ order, onClose, onReceive, onDone }: Props) {
  const [rows, setRows] = useState(order.lines.map((l) => ({ ...l, qty: String(l.quantity), cost: String(l.unit_cost || '') })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const lines = rows.filter((r) => Number(r.qty) > 0)
    .map((r) => ({ item_id: r.item_id, name: r.name, unit: r.unit, quantity: Number(r.qty), unit_cost: Number(r.cost) || 0 }));
  const total = lines.reduce((s, l) => s + l.quantity * l.unit_cost, 0);
  const set = (i: number, k: 'qty' | 'cost', v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const submit = async () => {
    if (!lines.length) { setError('Enter what arrived.'); return; }
    if (rows.some((r) => Number(r.qty) > 0 && r.cost === '')) { setError('Enter the rate for every item that arrived.'); return; }
    setBusy(true); setError(null);
    try {
      const r = await onReceive(order.id, lines);
      onDone(r.failed.length ? `Received ${r.received} item(s); not recorded: ${r.failed.join('; ')}` : `${order.reference} received: ${r.received} item${r.received === 1 ? '' : 's'} added to stock.`);
      onClose();
    } catch (e: any) { setError(e.message); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-neutral-950/40 sm:items-center sm:p-3" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Receive ${order.reference}`} onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border border-neutral-200 bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-start justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 className="font-serif text-2xl text-neutral-950">Receive delivery</h2>
            <p className="text-xs text-neutral-500">{order.vendor_name} · {order.reference}. Set what arrived and the billed rate; leave 0 for anything not delivered.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 cursor-pointer"><X className="h-5 w-5" /></button>
        </header>
        <ul className="flex-1 divide-y divide-neutral-100 overflow-y-auto px-5">
          {rows.map((r, i) => (
            <li key={r.item_id} className="grid grid-cols-[1fr_6.5rem_6.5rem] items-center gap-2 py-2.5">
              <div className="min-w-0"><p className="truncate text-sm font-medium text-neutral-950">{r.name}</p><p className="text-[11px] text-neutral-500">Ordered {r.quantity} {r.unit}{r.is_new && <span className="ml-1 font-semibold text-emerald-700">· new item</span>}</p></div>
              <label><span className="sr-only">Arrived ({r.unit})</span><input type="number" min={0} step="any" value={r.qty} onChange={(e) => set(i, 'qty', e.target.value)} className={num} /></label>
              <label><span className="sr-only">Rate</span><input type="number" min={0} step="any" value={r.cost} placeholder="₹ rate" onChange={(e) => set(i, 'cost', e.target.value)} className={num} /></label>
            </li>
          ))}
        </ul>
        <footer className="space-y-2 border-t border-neutral-200 px-5 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
          {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-neutral-700">Bill value <strong className="text-neutral-950">{inr(total, 2)}</strong></p>
            <button type="button" onClick={submit} disabled={busy} className="h-12 rounded-2xl bg-neutral-950 px-6 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40 cursor-pointer active:scale-[0.99]">{busy ? 'Adding to stock…' : 'Add to stock'}</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

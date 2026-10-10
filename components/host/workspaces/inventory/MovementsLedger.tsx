'use client';

import { useEffect, useState } from 'react';
import type { StockMovement } from '@/lib/services/inventory/inventory.types';
import { inr, istDateTime, movementStyle, qty } from './inventory-format';

const FILTERS = [['', 'All'], ['PURCHASE', 'Purchases'], ['CONSUMPTION', 'Used in sales'], ['WASTAGE', 'Wastage'], ['COUNT', 'Counts'], ['ADJUSTMENT', 'Adjustments']] as const;

interface Props { itemId?: string; version: number; compact?: boolean }

/** The stock ledger, newest first: what moved, why, the value, and the stock left after. */
export function MovementsLedger({ itemId, version, compact = false }: Props) {
  const [type, setType] = useState('');
  const [rows, setRows] = useState<StockMovement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const p = new URLSearchParams({ limit: compact ? '25' : '300' });
    if (itemId) p.set('item_id', itemId);
    if (type) p.set('type', type);
    fetch(`/api/host/inventory/movements?${p}`, { cache: 'no-store' })
      .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error); return j; })
      .then((j) => { if (live) { setRows(j.movements || []); setError(null); } })
      .catch((e) => { if (live) setError(e?.message || 'The stock history could not be loaded.'); });
    return () => { live = false; };
  }, [itemId, type, version, compact]);

  return (
    <section aria-label="Stock history" className={compact ? '' : 'overflow-hidden rounded-2xl border border-neutral-200 bg-white'}>
      {!compact && (
        <div className="flex gap-1.5 overflow-x-auto border-b border-neutral-200 p-3 no-scrollbar">
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setType(id)}
              className={`h-8 shrink-0 rounded-lg border px-3 text-xs font-semibold cursor-pointer ${type === id ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-600 hover:text-neutral-900'}`}>{label}</button>
          ))}
        </div>
      )}
      {error ? <p className="p-6 text-center text-sm text-rose-700">{error}</p>
        : rows === null ? <div className="space-y-2 p-3">{[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-neutral-100" />)}</div>
        : rows.length === 0 ? <p className="p-6 text-center text-sm text-neutral-500">No stock movements yet.</p>
        : (
          <ul className="divide-y divide-neutral-100">
            {rows.map((m) => {
              const s = movementStyle(m.action_type);
              return (
                <li key={m.id} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${s.chip}`}>{s.label}</span>
                      {!itemId && <span className="font-semibold text-neutral-950">{m.item_name}</span>}
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-neutral-500">
                      {istDateTime(m.logged_at)}{m.supplier_name ? ` · ${m.supplier_name}` : ''}{m.reference && m.action_type === 'PURCHASE' ? ` · bill ${m.reference}` : ''}{m.notes ? ` · ${m.notes}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`font-mono tabular-nums ${m.change_amount < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{m.change_amount > 0 ? '+' : ''}{qty(m.change_amount, m.unit)}</p>
                    <p className="text-[11px] text-neutral-500">{inr(m.total_cost, 2)}{m.stock_after !== null ? ` · left ${qty(m.stock_after)}` : ''}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
    </section>
  );
}

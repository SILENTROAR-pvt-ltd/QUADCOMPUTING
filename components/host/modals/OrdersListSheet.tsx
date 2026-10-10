'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, X } from 'lucide-react';
import { InvoicePreviewModal } from '@/components/host/workspaces/billing/InvoicePreviewModal';
import type { LedgerOrder } from '@/lib/services/analytics/orders-ledger.util';
import { OrderLedgerRow } from './orders/OrderLedgerRow';
import { useOrdersLedger, type LedgerPeriod } from './orders/useOrdersLedger';
import { inr, istDay, matchesSearch, statusOf, toInvoice, type StatusFilter } from './orders/ledger-format';

interface OrdersListSheetProps {
  timeframe: LedgerPeriod;
  /** The dashboard's custom range, used when the period is "custom". */
  customRange?: { start: string; end: string } | null;
  venueId?: string;
  onClose: () => void;
}

const PERIODS: Array<{ id: LedgerPeriod; label: string }> = [
  { id: 'daily', label: 'Today' }, { id: 'weekly', label: '7 days' }, { id: 'monthly', label: '12 months' },
];
const FILTERS: StatusFilter[] = ['all', 'settled', 'open', 'cancelled'];

/** Every bill in the dashboard's period, with the guest and wallet use the receipt prints. */
export function OrdersListSheet({ timeframe, customRange = null, venueId, onClose }: OrdersListSheetProps) {
  const [period, setPeriod] = useState<LedgerPeriod>(timeframe === 'custom' && !customRange ? 'daily' : timeframe);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [receipt, setReceipt] = useState<LedgerOrder | null>(null);
  const ledger = useOrdersLedger(period, customRange, venueId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !receipt) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, receipt]);

  const counts = useMemo(() => {
    const c = { all: ledger.orders.length, settled: 0, open: 0, cancelled: 0 };
    for (const o of ledger.orders) c[statusOf(o)] += 1;
    return c;
  }, [ledger.orders]);
  const settledTotal = useMemo(() => ledger.orders.filter((o) => statusOf(o) === 'settled').reduce((a, o) => a + o.grand_total, 0), [ledger.orders]);
  const visible = ledger.orders.filter((o) => (filter === 'all' || statusOf(o) === filter) && matchesSearch(o, query.trim()));
  const periodLabel = ledger.start && ledger.end ? (istDay(ledger.start) === istDay(ledger.end) ? istDay(ledger.start) : `${istDay(ledger.start)} – ${istDay(ledger.end)}`) : '';
  const periods = timeframe === 'custom' && customRange ? [...PERIODS, { id: 'custom' as const, label: 'Custom' }] : PERIODS;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/30 p-3 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Bills" onClick={(e) => e.stopPropagation()}
        className="flex h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-50 shadow-2xl">
        <header className="border-b border-neutral-200 bg-white px-5 pb-4 pt-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl text-neutral-950">Bills</h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                {periodLabel || 'Loading…'} · {counts.settled} settled · <strong className="font-semibold text-neutral-800">{inr(settledTotal)}</strong>
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => void ledger.reload()} aria-label="Refresh" className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer">
                <RefreshCw className={`h-4 w-4 ${ledger.isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div role="tablist" aria-label="Period" className="flex gap-1 rounded-xl bg-neutral-100 p-1">
              {periods.map((p) => (
                <button key={p.id} type="button" role="tab" aria-selected={period === p.id} onClick={() => setPeriod(p.id)}
                  className={`h-8 rounded-lg px-3 text-xs font-semibold cursor-pointer ${period === p.id ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`}>{p.label}</button>
              ))}
            </div>
            <label className="relative block sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Guest, @handle, phone, table, bill no."
                className="h-9 w-full rounded-xl border border-neutral-200 bg-white pl-8 pr-3 text-xs outline-none focus:border-neutral-400" />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                className={`h-7 rounded-full border px-3 text-[11px] font-semibold capitalize cursor-pointer ${filter === f ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'}`}>
                {f} <span className="opacity-60">{counts[f]}</span>
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {ledger.error ? (
            <div className="mt-10 text-center text-sm text-rose-700">
              <p>{ledger.error}</p>
              <button type="button" onClick={() => void ledger.reload()} className="mt-3 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 cursor-pointer">Try again</button>
            </div>
          ) : ledger.isLoading && ledger.orders.length === 0 ? (
            <div className="space-y-3" aria-busy="true">{[1, 2, 3, 4].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-200/60" />)}</div>
          ) : visible.length === 0 ? (
            <p className="mt-10 text-center text-sm text-neutral-500">No bills match this view.</p>
          ) : (
            <ul className="space-y-3">{visible.map((o) => <OrderLedgerRow key={o.id} order={o} onOpen={setReceipt} />)}</ul>
          )}
          {ledger.truncated && <p className="mt-4 text-center text-[11px] text-neutral-500">Showing the latest 500 bills. Narrow the period to see older ones.</p>}
        </div>
      </div>
    </div>
    {receipt && <InvoicePreviewModal invoice={toInvoice(receipt)} onClose={() => setReceipt(null)} />}
    </>
  );
}

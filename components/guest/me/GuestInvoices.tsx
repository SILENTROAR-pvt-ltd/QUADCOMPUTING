'use client';

import React, { useMemo, useState } from 'react';
import { ChevronRight, Download, Loader2, Receipt } from 'lucide-react';
import { EMPTY_INVOICE_FILTERS, useGuestInvoices, type InvoiceFiltersUi } from './useGuestInvoices';
import { GuestInvoiceSheet } from './GuestInvoiceSheet';
import type { GuestInvoice } from '@/lib/services/guest-auth/guest-bills.service';

interface GuestInvoicesProps {
  handle: string | null;
  currentVenueId?: string;
}

type Period = 'all' | '7' | '30' | 'custom';

const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const istDay = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const istToday = () => istDay(new Date().toISOString());
const shiftDay = (day: string, delta: number) => new Date(Date.parse(`${day}T00:00:00Z`) + delta * 86_400_000).toISOString().slice(0, 10);

function dayLabel(iso: string) {
  const day = istDay(iso);
  const today = istToday();
  if (day === today) return 'Today';
  if (day === shiftDay(today, -1)) return 'Yesterday';
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
}

const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });

/** Every bill the guest paid, across venues, with a venue breakdown, filters and export. */
export function GuestInvoices({ handle, currentVenueId }: GuestInvoicesProps) {
  const [venueId, setVenueId] = useState('');
  const [payment, setPayment] = useState<InvoiceFiltersUi['payment']>('ALL');
  const [period, setPeriod] = useState<Period>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [open, setOpen] = useState<GuestInvoice | null>(null);

  const filters: InvoiceFiltersUi = useMemo(() => {
    let f = from;
    let t = to;
    if (period === '7' || period === '30') {
      t = istToday();
      f = shiftDay(t, period === '7' ? -6 : -29);
    }
    if (period === 'all') { f = ''; t = ''; }
    return { venueId, payment, from: f, to: t };
  }, [venueId, payment, period, from, to]);

  const { invoices, venues, summary, hasMore, loading, loadingMore, error, loadMore, downloadCsv, retry } = useGuestInvoices(handle, filters);

  const filtersActive = venueId !== '' || payment !== 'ALL' || period !== 'all';
  const clearFilters = () => {
    setVenueId(EMPTY_INVOICE_FILTERS.venueId); setPayment('ALL'); setPeriod('all'); setFrom(''); setTo('');
  };

  const groups = useMemo(() => {
    const out: Array<{ label: string; items: GuestInvoice[] }> = [];
    for (const inv of invoices) {
      const label = dayLabel(inv.created_at);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(inv);
      else out.push({ label, items: [inv] });
    }
    return out;
  }, [invoices]);

  if (!handle) {
    return (
      <section className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">
        <h3 className="font-serif text-lg text-neutral-950">Bills</h3>
        <p className="mt-1 text-sm text-neutral-500">Sign in on this phone to see the bills you paid at every venue.</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white overflow-hidden" aria-label="Your bills">
      <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-3">
        <div>
          <h3 className="font-serif text-lg text-neutral-950">Bills</h3>
          <p className="text-xs text-neutral-500">Every settled bill, at every venue.</p>
        </div>
        <button
          type="button"
          onClick={async () => {
            setExporting(true); setExportError(null);
            try { await downloadCsv(); } catch (e: any) { setExportError(e?.message || 'Export failed.'); } finally { setExporting(false); }
          }}
          disabled={exporting || invoices.length === 0}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-50 disabled:opacity-40 cursor-pointer"
        >
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Export CSV
        </button>
      </div>

      {/* Venue breakdown: count and total paid per venue, which is also the venue filter */}
      {venues.length > 0 && (
        <div className="px-5 sm:px-6 pb-3">
          <div role="group" aria-label="Filter bills by venue" className="flex gap-2 overflow-x-auto pb-1">
            <button type="button" onClick={() => setVenueId('')} aria-pressed={venueId === ''}
              className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs cursor-pointer ${venueId === '' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'}`}>
              <span className="block font-semibold">All venues</span>
              <span className="block opacity-70">{(() => { const n = venues.reduce((s, v) => s + v.count, 0); return `${n} ${n === 1 ? 'bill' : 'bills'}`; })()}</span>
            </button>
            {venues.map((v) => (
              <button key={v.id} type="button" onClick={() => setVenueId(v.id)} aria-pressed={venueId === v.id}
                className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs cursor-pointer ${venueId === v.id ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'}`}>
                <span className="block font-semibold">{v.name}{v.id === currentVenueId ? ' · here' : ''}</span>
                <span className="block opacity-70">{v.count} {v.count === 1 ? 'bill' : 'bills'} · {inr(v.paid)} paid</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Period and payment */}
      <div className="px-5 sm:px-6 pb-4 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="invoices-period">Period</label>
        <select id="invoices-period" value={period} onChange={(e) => setPeriod(e.target.value as Period)}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900">
          <option value="all">All time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="custom">Custom dates</option>
        </select>
        {period === 'custom' && (
          <>
            <label className="sr-only" htmlFor="invoices-from">From</label>
            <input id="invoices-from" type="date" value={from} max={to || istToday()} onChange={(e) => setFrom(e.target.value)}
              className="rounded-xl border border-neutral-200 px-2.5 py-1.5 text-xs" />
            <label className="sr-only" htmlFor="invoices-to">To</label>
            <input id="invoices-to" type="date" value={to} min={from || undefined} max={istToday()} onChange={(e) => setTo(e.target.value)}
              className="rounded-xl border border-neutral-200 px-2.5 py-1.5 text-xs" />
          </>
        )}
        <label className="sr-only" htmlFor="invoices-payment">Payment</label>
        <select id="invoices-payment" value={payment} onChange={(e) => setPayment(e.target.value as InvoiceFiltersUi['payment'])}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900">
          <option value="ALL">All payments</option>
          <option value="UPI">UPI</option>
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="SPLIT">Split</option>
          <option value="WALLET">Wallet</option>
        </select>
        {filtersActive && (
          <button type="button" onClick={clearFilters} className="text-xs font-medium text-neutral-600 hover:text-neutral-950 cursor-pointer">Clear</button>
        )}
      </div>

      {summary && summary.count > 0 && (
        <div className="grid grid-cols-3 divide-x divide-neutral-100 border-y border-neutral-100 bg-neutral-50/60 text-center">
          <div className="py-3"><p className="text-[10px] uppercase tracking-wider text-neutral-500">Paid</p><p className="font-semibold text-neutral-950">{inr(summary.paid)}</p></div>
          <div className="py-3"><p className="text-[10px] uppercase tracking-wider text-neutral-500">Cashback</p><p className="font-semibold text-emerald-700">{inr(summary.cashback)}</p></div>
          <div className="py-3"><p className="text-[10px] uppercase tracking-wider text-neutral-500">Bills</p><p className="font-semibold text-neutral-950">{summary.count}</p></div>
        </div>
      )}

      {exportError && <p role="alert" className="px-5 sm:px-6 py-2 text-xs text-rose-600">{exportError}</p>}

      {error ? (
        <div className="px-5 sm:px-6 py-6 flex items-center justify-between gap-4">
          <p className="text-sm text-neutral-600">{error}</p>
          <button type="button" onClick={retry} className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-900 cursor-pointer">Try again</button>
        </div>
      ) : loading && invoices.length === 0 ? (
        <div className="px-5 sm:px-6 py-8 flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading bills…</div>
      ) : invoices.length === 0 ? (
        <div className="px-5 sm:px-6 py-8 text-center">
          <p className="text-sm text-neutral-700">{filtersActive ? 'No bills match these filters.' : 'No settled bills yet.'}</p>
          <p className="mt-1 text-xs text-neutral-500">{filtersActive ? 'Try another venue, period or payment.' : 'Your invoices appear here after you pay.'}</p>
        </div>
      ) : (
        <div>
          {groups.map((g) => (
            <div key={g.label + g.items[0].id}>
              <p className="sticky top-0 z-[1] bg-white/95 px-5 sm:px-6 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500 backdrop-blur">{g.label}</p>
              <ul className="divide-y divide-neutral-100">
                {g.items.map((inv) => (
                  <li key={inv.id}>
                    <button type="button" onClick={() => setOpen(inv)}
                      className="w-full flex items-center gap-3 px-5 sm:px-6 py-3.5 text-left hover:bg-neutral-50 cursor-pointer">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600"><Receipt className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-900">
                          Invoice #{inv.invoice_no}{inv.table_number ? ` · Table ${inv.table_number}` : ''}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-neutral-500">
                          <span className="inline-block rounded-md bg-neutral-100 px-1.5 py-0.5 font-medium text-neutral-700">{inv.venue_name}</span>
                          {' '}{timeLabel(inv.created_at)} · {inv.payment_method}
                          {inv.cashback > 0 ? ` · +${inr(inv.cashback)} cashback` : ''}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-neutral-900">{inr(inv.grand_total)}</p>
                      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {hasMore && (
            <div className="px-5 sm:px-6 py-4 text-center">
              <button type="button" onClick={loadMore} disabled={loadingMore}
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-50 disabled:opacity-50 cursor-pointer">
                {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Load more
              </button>
            </div>
          )}
        </div>
      )}

      {open && <GuestInvoiceSheet invoice={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

export default GuestInvoices;

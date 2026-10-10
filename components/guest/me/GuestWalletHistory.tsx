'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Download, Loader2, Search, X } from 'lucide-react';
import { EMPTY_FILTERS, useWalletHistory, type WalletHistoryFilters } from './useWalletHistory';
import { fetchInvoiceById } from './useGuestInvoices';
import { GuestInvoiceSheet } from './GuestInvoiceSheet';
import type { HistoryRow } from '@/lib/services/wallet/wallet-history.service';
import type { GuestInvoice } from '@/lib/services/guest-auth/guest-bills.service';

interface GuestWalletHistoryProps {
  handle: string | null;
  /** The venue the guest is currently at; labelled in the venue list. */
  currentVenueId?: string;
}

type Period = 'all' | '7' | '30' | 'custom';

const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const TYPE_TABS: Array<{ value: WalletHistoryFilters['type']; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'CASHBACK', label: 'Earned' },
  { value: 'REDEMPTION', label: 'Used' },
  { value: 'ADJUSTMENT', label: 'Adjusted' },
];
const TYPE_LABEL: Record<string, string> = { CASHBACK: 'Cashback earned', REDEMPTION: 'Used on bill', ADJUSTMENT: 'Adjustment' };

const istDay = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const istToday = () => istDay(new Date().toISOString());
const shiftDay = (day: string, delta: number) => new Date(Date.parse(`${day}T00:00:00Z`) + delta * 86_400_000).toISOString().slice(0, 10);

function dayLabel(day: string) {
  const today = istToday();
  if (day === today) return 'Today';
  if (day === shiftDay(today, -1)) return 'Yesterday';
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });
}

function groupByDay(rows: HistoryRow[]) {
  const groups: Array<{ day: string; items: HistoryRow[] }> = [];
  for (const row of rows) {
    const day = istDay(row.created_at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(row);
    else groups.push({ day, items: [row] });
  }
  return groups;
}

/** Wallet history across every venue: venue filter, type, period, search, export and paging. */
export function GuestWalletHistory({ handle, currentVenueId }: GuestWalletHistoryProps) {
  const [venueId, setVenueId] = useState('');
  const [type, setType] = useState<WalletHistoryFilters['type']>('ALL');
  const [period, setPeriod] = useState<Period>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<GuestInvoice | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  // The ledger row's bill, opened in the same invoice view the Bills list uses.
  const openInvoice = async (orderId: string) => {
    if (!handle) return;
    setInvoiceLoading(orderId);
    setInvoiceError(null);
    try {
      const found = await fetchInvoiceById(handle, orderId);
      if (found) setInvoice(found);
      else setInvoiceError('This bill is not on your account.');
    } catch (e: any) {
      setInvoiceError(e?.message || 'The invoice could not be loaded.');
    } finally {
      setInvoiceLoading(null);
    }
  };

  // Search waits until the guest stops typing, so each keystroke is not a request.
  useEffect(() => {
    const t = setTimeout(() => setQ(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filters: WalletHistoryFilters = useMemo(() => {
    let f = from;
    let t = to;
    if (period === '7' || period === '30') {
      t = istToday();
      f = shiftDay(t, period === '7' ? -6 : -29);
    }
    if (period === 'all') { f = ''; t = ''; }
    return { venueId, type, from: f, to: t, q };
  }, [venueId, type, period, from, to, q]);

  const { rows, venues, summary, hasMore, loading, loadingMore, error, loadMore, downloadCsv, retry } = useWalletHistory(handle, filters);

  const filtersActive = venueId !== '' || type !== 'ALL' || period !== 'all' || q !== '';
  const clearFilters = () => {
    setVenueId(EMPTY_FILTERS.venueId); setType('ALL'); setPeriod('all');
    setFrom(''); setTo(''); setSearchInput(''); setQ('');
  };

  const groups = useMemo(() => groupByDay(rows), [rows]);
  const venueName = (id: string) => venues.find((v) => v.id === id)?.name ?? 'Venue';

  if (!handle) {
    return (
      <section className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">
        <h3 className="font-serif text-lg text-neutral-950">History</h3>
        <p className="mt-1 text-sm text-neutral-500">Sign in on this phone to see your cashback and wallet use across every venue.</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white overflow-hidden" aria-label="Wallet history">
      <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-3">
        <div>
          <h3 className="font-serif text-lg text-neutral-950">History</h3>
          <p className="text-xs text-neutral-500">Cashback and wallet use across every venue.</p>
        </div>
        <button
          type="button"
          onClick={async () => {
            setExporting(true); setExportError(null);
            try { await downloadCsv(); } catch (e: any) { setExportError(e?.message || 'Export failed.'); } finally { setExporting(false); }
          }}
          disabled={exporting || rows.length === 0}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-50 disabled:opacity-40 cursor-pointer"
        >
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Export CSV
        </button>
      </div>

      {/* Venue filter, with each venue's balance */}
      {venues.length > 0 && (
        <div className="px-5 sm:px-6 pb-3">
          <div role="group" aria-label="Filter by venue" className="flex gap-2 overflow-x-auto pb-1">
            <button type="button" onClick={() => setVenueId('')} aria-pressed={venueId === ''}
              className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs cursor-pointer ${venueId === '' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'}`}>
              <span className="block font-semibold">All venues</span>
              <span className="block opacity-70">{venues.length} {venues.length === 1 ? 'venue' : 'venues'}</span>
            </button>
            {venues.map((v) => (
              <button key={v.id} type="button" onClick={() => setVenueId(v.id)} aria-pressed={venueId === v.id}
                className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs cursor-pointer ${venueId === v.id ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'}`}>
                <span className="block font-semibold">{v.name}{v.id === currentVenueId ? ' · here' : ''}</span>
                <span className="block opacity-70">Balance {inr(v.balance)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Type and period */}
      <div className="px-5 sm:px-6 pb-3 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filter by type" className="inline-flex rounded-xl bg-neutral-100 p-1">
          {TYPE_TABS.map((t) => (
            <button key={t.value} type="button" onClick={() => setType(t.value)} aria-pressed={type === t.value}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-pointer ${type === t.value ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="wallet-history-period">Period</label>
        <select id="wallet-history-period" value={period} onChange={(e) => setPeriod(e.target.value as Period)}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900">
          <option value="all">All time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="custom">Custom dates</option>
        </select>
        {period === 'custom' && (
          <>
            <label className="sr-only" htmlFor="wallet-history-from">From</label>
            <input id="wallet-history-from" type="date" value={from} max={to || istToday()} onChange={(e) => setFrom(e.target.value)}
              className="rounded-xl border border-neutral-200 px-2.5 py-1.5 text-xs" />
            <label className="sr-only" htmlFor="wallet-history-to">To</label>
            <input id="wallet-history-to" type="date" value={to} min={from || undefined} max={istToday()} onChange={(e) => setTo(e.target.value)}
              className="rounded-xl border border-neutral-200 px-2.5 py-1.5 text-xs" />
          </>
        )}
      </div>

      {/* Search */}
      <div className="px-5 sm:px-6 pb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search table, order note or description"
            aria-label="Search history"
            maxLength={60}
            className="w-full rounded-xl border border-neutral-200 py-2 pl-8 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400"
          />
        </div>
        {filtersActive && (
          <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-950 cursor-pointer">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Summary for the current filter */}
      {summary && summary.count > 0 && (
        <div className="grid grid-cols-3 divide-x divide-neutral-100 border-y border-neutral-100 bg-neutral-50/60 text-center">
          <div className="py-3"><p className="text-[10px] uppercase tracking-wider text-neutral-500">Earned</p><p className="font-semibold text-emerald-700">{inr(summary.earned)}</p></div>
          <div className="py-3"><p className="text-[10px] uppercase tracking-wider text-neutral-500">Used</p><p className="font-semibold text-neutral-900">{inr(summary.used)}</p></div>
          <div className="py-3"><p className="text-[10px] uppercase tracking-wider text-neutral-500">Entries</p><p className="font-semibold text-neutral-900">{summary.count}</p></div>
        </div>
      )}

      {exportError && <p role="alert" className="px-5 sm:px-6 py-2 text-xs text-rose-600">{exportError}</p>}
      {invoiceError && <p role="alert" className="px-5 sm:px-6 py-2 text-xs text-rose-600">{invoiceError}</p>}
      {invoice && <GuestInvoiceSheet invoice={invoice} onClose={() => setInvoice(null)} />}

      {/* List */}
      {error ? (
        <div className="px-5 sm:px-6 py-6 flex items-center justify-between gap-4">
          <p className="text-sm text-neutral-600">{error}</p>
          <button type="button" onClick={retry} className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-900 cursor-pointer">Try again</button>
        </div>
      ) : loading && rows.length === 0 ? (
        <div className="px-5 sm:px-6 py-8 flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading history…</div>
      ) : rows.length === 0 ? (
        <div className="px-5 sm:px-6 py-8 text-center">
          <p className="text-sm text-neutral-700">{filtersActive ? 'No activity matches these filters.' : 'No wallet activity yet.'}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {filtersActive ? 'Try another venue, type or date.' : 'Cashback appears here once a bill settles.'}
          </p>
          {filtersActive && (
            <button type="button" onClick={clearFilters} className="mt-3 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-900 cursor-pointer">Clear filters</button>
          )}
        </div>
      ) : (
        <div>
          {groups.map((g) => (
            <div key={g.day}>
              <p className="sticky top-0 z-[1] bg-white/95 px-5 sm:px-6 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500 backdrop-blur">{dayLabel(g.day)}</p>
              <ul className="divide-y divide-neutral-100">
                {g.items.map((t) => {
                  const credit = t.transaction_type === 'CASHBACK' || (t.transaction_type === 'ADJUSTMENT' && t.amount > 0);
                  return (
                    <li key={t.id} className="flex items-start gap-3 px-5 sm:px-6 py-3.5">
                      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${credit ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-600'}`}>
                        {credit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-neutral-900 truncate">
                          {TYPE_LABEL[t.transaction_type] ?? t.transaction_type}{t.table_number ? ` · Table ${t.table_number}` : ''}
                        </p>
                        <p className="mt-0.5 text-[11px] text-neutral-500 truncate">
                          <span className="inline-block rounded-md bg-neutral-100 px-1.5 py-0.5 font-medium text-neutral-700">{venueName(t.venue_id)}</span>
                          {' '}{timeLabel(t.created_at)}{t.description ? ` · ${t.description}` : ''}
                        </p>
                        {t.order_id && handle && (
                          <button
                            type="button"
                            onClick={() => void openInvoice(t.order_id as string)}
                            disabled={invoiceLoading === t.order_id}
                            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-700 underline-offset-2 hover:underline disabled:opacity-50 cursor-pointer"
                          >
                            {invoiceLoading === t.order_id && <Loader2 className="h-3 w-3 animate-spin" />}
                            View invoice #{t.order_id.split('-')[0].toUpperCase()}
                          </button>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-sm font-semibold ${credit ? 'text-emerald-700' : 'text-neutral-900'}`}>
                          {credit ? '+' : '−'}{inr(Math.abs(t.amount))}
                        </p>
                        <p className="text-[10px] text-neutral-400">Balance {inr(t.balance_after)}</p>
                      </div>
                    </li>
                  );
                })}
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
    </section>
  );
}

export default GuestWalletHistory;

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { EMPTY_FILTERS, useWalletHistory, type WalletHistoryFilters } from './useWalletHistory';
import { fetchInvoiceById } from './useGuestInvoices';
import { GuestInvoiceSheet } from './GuestInvoiceSheet';
import type { GuestInvoice } from '@/lib/services/guest-auth/guest-bills.service';
import { HistoryFilters } from './wallet-history/HistoryFilters';
import { HistoryList } from './wallet-history/HistoryList';
import { SummaryBar } from './shared/SummaryBar';
import { SectionHeader } from './shared/SectionHeader';
import { usePeriodFilter } from './shared/usePeriodFilter';
import { inr } from './wallet-history/history-format';

interface GuestWalletHistoryProps {
  handle: string | null;
  /** The venue the guest is currently at; labelled in the venue list. */
  currentVenueId?: string;
}

/** Wallet history across every venue: venue filter, type, period, search, export and paging. */
export function GuestWalletHistory({ handle, currentVenueId }: GuestWalletHistoryProps) {
  const [venueId, setVenueId] = useState('');
  const [type, setType] = useState<WalletHistoryFilters['type']>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [billLoading, setBillLoading] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<GuestInvoice | null>(null);
  const when = usePeriodFilter();

  // Search waits until the guest stops typing, so each keystroke is not a request.
  useEffect(() => {
    const t = setTimeout(() => setQ(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filters: WalletHistoryFilters = useMemo(() => ({ venueId, type, from: when.range.from, to: when.range.to, q }), [venueId, type, when.range, q]);
  const { rows, venues, summary, hasMore, loading, loadingMore, error, loadMore, downloadCsv, retry } = useWalletHistory(handle, filters);
  const active = venueId !== '' || type !== 'ALL' || when.period !== 'all' || q !== '';
  const clear = () => { setVenueId(EMPTY_FILTERS.venueId); setType('ALL'); when.reset(); setSearchInput(''); setQ(''); };

  // The ledger row's bill, opened in the same invoice view the Bills list uses.
  const openBill = async (orderId: string) => {
    if (!handle) return;
    setBillLoading(orderId);
    setNotice(null);
    try {
      const found = await fetchInvoiceById(handle, orderId);
      if (found) setInvoice(found); else setNotice('This bill is not on your account.');
    } catch (e: any) {
      setNotice(e?.message || 'The invoice could not be loaded.');
    } finally {
      setBillLoading(null);
    }
  };

  if (!handle) {
    return (
      <section className="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6">
        <h3 className="font-serif text-lg text-neutral-950">History</h3>
        <p className="mt-1 text-sm text-neutral-500">Sign in on this phone to see your cashback and wallet use across every venue.</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white" aria-label="Wallet history">
      <SectionHeader title="History" subtitle="Cashback and wallet use across every venue." onExport={downloadCsv} canExport={rows.length > 0} onError={setNotice} />
      <HistoryFilters venues={venues} currentVenueId={currentVenueId} venueId={venueId} onVenue={setVenueId} type={type} onType={setType}
        period={when.period} onPeriod={when.setPeriod} from={when.from} to={when.to} onFrom={when.setFrom} onTo={when.setTo}
        search={searchInput} onSearch={setSearchInput} active={active} onClear={clear} />
      {summary && summary.count > 0 && (
        <SummaryBar items={[{ label: 'Earned', value: inr(summary.earned), tone: 'text-emerald-700' }, { label: 'Used', value: inr(summary.used) }, { label: 'Entries', value: String(summary.count) }]} />
      )}
      {notice && <p role="alert" className="px-5 py-2 text-xs text-rose-600 sm:px-6">{notice}</p>}
      {invoice && <GuestInvoiceSheet invoice={invoice} onClose={() => setInvoice(null)} />}
      <HistoryList rows={rows} loading={loading} error={error} filtersActive={active} hasMore={hasMore} loadingMore={loadingMore}
        venueName={(id) => venues.find((v) => v.id === id)?.name ?? 'Venue'} billLoading={billLoading} onOpenBill={(id) => void openBill(id)}
        onRetry={retry} onClear={clear} onMore={loadMore} />
    </section>
  );
}

export default GuestWalletHistory;

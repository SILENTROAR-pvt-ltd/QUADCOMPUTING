'use client';

import React, { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { EMPTY_INVOICE_FILTERS, useGuestInvoices, type InvoiceFiltersUi } from './useGuestInvoices';
import { GuestInvoiceSheet } from './GuestInvoiceSheet';
import { ListSkeleton } from '@/components/guest/shared/ListSkeleton';
import type { GuestInvoice } from '@/lib/services/guest-auth/guest-bills.service';
import { InvoiceFilters } from './invoices/InvoiceFilters';
import { InvoiceRow } from './invoices/InvoiceRow';
import { SummaryBar } from './shared/SummaryBar';
import { SectionHeader } from './shared/SectionHeader';
import { usePeriodFilter } from './shared/usePeriodFilter';
import { dayLabel, inr, istDay } from './wallet-history/history-format';

interface GuestInvoicesProps {
  handle: string | null;
  currentVenueId?: string;
}

const PAD = 'px-5 sm:px-6';
const GHOST = 'cursor-pointer rounded-xl border border-neutral-200 px-3 py-2.5 text-xs font-semibold text-neutral-900 hover:bg-neutral-50';

/** Every bill the guest paid, across venues, with a venue breakdown, filters and export. */
export function GuestInvoices({ handle, currentVenueId }: GuestInvoicesProps) {
  const [venueId, setVenueId] = useState('');
  const [payment, setPayment] = useState<InvoiceFiltersUi['payment']>('ALL');
  const [notice, setNotice] = useState<string | null>(null);
  const [open, setOpen] = useState<GuestInvoice | null>(null);
  const when = usePeriodFilter();

  const filters: InvoiceFiltersUi = useMemo(() => ({ venueId, payment, from: when.range.from, to: when.range.to }), [venueId, payment, when.range]);
  const { invoices, venues, summary, hasMore, loading, loadingMore, error, loadMore, downloadCsv, retry } = useGuestInvoices(handle, filters);
  const active = venueId !== '' || payment !== 'ALL' || when.period !== 'all';
  const clear = () => { setVenueId(EMPTY_INVOICE_FILTERS.venueId); setPayment('ALL'); when.reset(); };

  const groups = useMemo(() => {
    const out: Array<{ day: string; items: GuestInvoice[] }> = [];
    for (const inv of invoices) {
      const day = istDay(inv.created_at);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(inv); else out.push({ day, items: [inv] });
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
    <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white" aria-label="Your bills">
      <SectionHeader title="Bills" subtitle="Every settled bill, at every venue." onExport={downloadCsv} canExport={invoices.length > 0} onError={setNotice} />
      <InvoiceFilters venues={venues} currentVenueId={currentVenueId} venueId={venueId} onVenue={setVenueId} period={when.period} onPeriod={when.setPeriod}
        from={when.from} to={when.to} onFrom={when.setFrom} onTo={when.setTo} payment={payment} onPayment={setPayment} active={active} onClear={clear} />
      {summary && summary.count > 0 && (
        <SummaryBar items={[{ label: 'Paid', value: inr(summary.paid) }, { label: 'Cashback', value: inr(summary.cashback), tone: 'text-emerald-700' }, { label: 'Bills', value: String(summary.count) }]} />
      )}
      {notice && <p role="alert" className={`py-2 text-xs text-rose-600 ${PAD}`}>{notice}</p>}

      {error ? (
        <div className={`flex items-center justify-between gap-4 py-6 ${PAD}`}>
          <p className="text-sm text-neutral-600">{error}</p>
          <button type="button" onClick={retry} className={GHOST}>Try again</button>
        </div>
      ) : loading && invoices.length === 0 ? (
        <ListSkeleton label="Loading bills" />
      ) : invoices.length === 0 ? (
        <div className={`py-8 text-center ${PAD}`}>
          <p className="text-sm text-neutral-700">{active ? 'No bills match these filters.' : 'No settled bills yet.'}</p>
          <p className="mt-1 text-xs text-neutral-500">{active ? 'Try another venue, period or payment.' : 'Your invoices appear here after you pay.'}</p>
        </div>
      ) : (
        <div>
          {groups.map((g) => (
            <div key={g.day}>
              <p className={`sticky top-0 z-[1] bg-white/95 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500 backdrop-blur ${PAD}`}>{dayLabel(g.day)}</p>
              <ul className="divide-y divide-neutral-100">{g.items.map((inv) => <InvoiceRow key={inv.id} invoice={inv} onOpen={setOpen} />)}</ul>
            </div>
          ))}
          {hasMore && (
            <div className={`py-4 text-center ${PAD}`}>
              <button type="button" onClick={loadMore} disabled={loadingMore} className={`inline-flex items-center gap-1.5 px-4 disabled:opacity-50 ${GHOST}`}>
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

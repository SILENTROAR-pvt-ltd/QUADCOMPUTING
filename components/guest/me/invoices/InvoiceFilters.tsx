'use client';

import React from 'react';
import type { InvoiceFiltersUi } from '../useGuestInvoices';
import { inr, istToday, type Period } from '../wallet-history/history-format';

interface VenueTotal { id: string; name: string; count: number; paid: number }

interface InvoiceFiltersProps {
  venues: VenueTotal[];
  currentVenueId?: string;
  venueId: string;
  onVenue: (id: string) => void;
  period: Period;
  onPeriod: (p: Period) => void;
  from: string;
  to: string;
  onFrom: (d: string) => void;
  onTo: (d: string) => void;
  payment: InvoiceFiltersUi['payment'];
  onPayment: (p: InvoiceFiltersUi['payment']) => void;
  active: boolean;
  onClear: () => void;
}

const SELECT = 'rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900';
const chip = (on: boolean) => `shrink-0 cursor-pointer rounded-xl border px-3 py-2 text-left text-xs transition-colors ${on ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'}`;

/** The venue breakdown (count and total paid per venue, which is also the venue filter), the period and the payment type. */
export function InvoiceFilters(p: InvoiceFiltersProps) {
  const total = p.venues.reduce((s, v) => s + v.count, 0);
  return (
    <>
      {p.venues.length > 0 && (
        <div className="px-5 pb-3 sm:px-6">
          <div role="group" aria-label="Filter bills by venue" className="flex gap-2 overflow-x-auto pb-1">
            <button type="button" onClick={() => p.onVenue('')} aria-pressed={p.venueId === ''} className={chip(p.venueId === '')}>
              <span className="block font-semibold">All venues</span>
              <span className="block opacity-70">{total} {total === 1 ? 'bill' : 'bills'}</span>
            </button>
            {p.venues.map((v) => (
              <button key={v.id} type="button" onClick={() => p.onVenue(v.id)} aria-pressed={p.venueId === v.id} className={chip(p.venueId === v.id)}>
                <span className="block font-semibold">{v.name}{v.id === p.currentVenueId ? ' · here' : ''}</span>
                <span className="block opacity-70">{v.count} {v.count === 1 ? 'bill' : 'bills'} · {inr(v.paid)} paid</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 px-5 pb-4 sm:px-6">
        <label className="sr-only" htmlFor="invoices-period">Period</label>
        <select id="invoices-period" value={p.period} onChange={(e) => p.onPeriod(e.target.value as Period)} className={SELECT}>
          <option value="all">All time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="custom">Custom dates</option>
        </select>
        {p.period === 'custom' && (
          <>
            <label className="sr-only" htmlFor="invoices-from">From</label>
            <input id="invoices-from" type="date" value={p.from} max={p.to || istToday()} onChange={(e) => p.onFrom(e.target.value)} className="rounded-xl border border-neutral-200 px-2.5 py-1.5 text-xs" />
            <label className="sr-only" htmlFor="invoices-to">To</label>
            <input id="invoices-to" type="date" value={p.to} min={p.from || undefined} max={istToday()} onChange={(e) => p.onTo(e.target.value)} className="rounded-xl border border-neutral-200 px-2.5 py-1.5 text-xs" />
          </>
        )}
        <label className="sr-only" htmlFor="invoices-payment">Payment</label>
        <select id="invoices-payment" value={p.payment} onChange={(e) => p.onPayment(e.target.value as InvoiceFiltersUi['payment'])} className={SELECT}>
          <option value="ALL">All payments</option>
          {['UPI', 'CASH', 'CARD', 'SPLIT', 'WALLET'].map((m) => <option key={m} value={m}>{m[0] + m.slice(1).toLowerCase()}</option>)}
        </select>
        {p.active && <button type="button" onClick={p.onClear} className="min-h-9 cursor-pointer text-xs font-medium text-neutral-600 hover:text-neutral-950">Clear</button>}
      </div>
    </>
  );
}

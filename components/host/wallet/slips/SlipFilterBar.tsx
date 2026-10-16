'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import type { FeeFilter, PaymentFilter } from '@/lib/services/wallet/day-slips.util';
import type { RangePreset, SlipQuery } from './useDaySlips';

const PRESETS: Array<{ id: RangePreset; label: string }> = [
  { id: 'today', label: 'Today' }, { id: 'yesterday', label: 'Yesterday' }, { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' }, { id: 'all', label: 'All time' },
];
const FEES: Array<{ id: FeeFilter; label: string }> = [
  { id: 'all', label: 'All fees' }, { id: 'due', label: 'Fee due' }, { id: 'paid', label: 'Fee paid' }, { id: 'none', label: 'No fee' },
];
const PAYMENTS: Array<{ id: PaymentFilter; label: string }> = [
  { id: 'all', label: 'All payments' }, { id: 'UPI', label: 'UPI' }, { id: 'CASH', label: 'Cash' }, { id: 'CARD', label: 'Card' }, { id: 'OTHER', label: 'Other' },
];

const select = 'h-9 cursor-pointer rounded-xl border border-neutral-200 bg-white px-2.5 text-xs font-medium text-neutral-800 focus:border-neutral-900 focus:outline-none';

interface Props {
  query: SlipQuery;
  today: string;
  search: string;
  filtered: boolean;
  onSearch: (value: string) => void;
  onChange: (patch: Partial<SlipQuery>) => void;
  onReset: () => void;
}

/** Range presets or one billing day, fee status, payment method and a search over invoice, table and guest. */
export function SlipFilterBar({ query, today, search, filtered, onSearch, onChange, onReset }: Props) {
  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Date range" className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={query.preset === p.id} onClick={() => onChange({ preset: p.id })}
            className={`h-8 cursor-pointer rounded-full px-3 text-xs font-semibold transition ${query.preset === p.id ? 'bg-neutral-950 text-white' : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'}`}>
            {p.label}
          </button>
        ))}
        <label className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold ${query.preset === 'day' ? 'border-neutral-950 text-neutral-950' : 'border-neutral-200 text-neutral-700'}`}>
          <span>Day</span>
          <input type="date" max={today} value={query.day} aria-label="Billing day"
            onChange={(e) => e.target.value && onChange({ preset: 'day', day: e.target.value })}
            className="bg-transparent text-xs font-medium focus:outline-none" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <select aria-label="Fee status" value={query.fee} onChange={(e) => onChange({ fee: e.target.value as FeeFilter })} className={select}>
          {FEES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <select aria-label="Payment method" value={query.payment} onChange={(e) => onChange({ payment: e.target.value as PaymentFilter })} className={select}>
          {PAYMENTS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <label className="relative col-span-2 sm:min-w-[220px] sm:flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" aria-hidden />
          <input type="search" value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Invoice, table or guest"
            aria-label="Search invoices" className="h-9 w-full rounded-xl border border-neutral-200 bg-white pl-8 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none" />
        </label>
        {filtered && (
          <button type="button" onClick={onReset} className="col-span-2 inline-flex h-9 cursor-pointer items-center justify-center gap-1 rounded-xl px-3 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 sm:col-span-1">
            <X className="h-3.5 w-3.5" aria-hidden /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

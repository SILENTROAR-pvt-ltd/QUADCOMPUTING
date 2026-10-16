'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import type { WalletHistoryFilters } from '../useWalletHistory';
import { inr, istToday, TYPE_TABS, type Period } from './history-format';

interface Venue { id: string; name: string; balance: number }

interface HistoryFiltersProps {
  venues: Venue[];
  currentVenueId?: string;
  venueId: string;
  onVenue: (id: string) => void;
  type: WalletHistoryFilters['type'];
  onType: (t: WalletHistoryFilters['type']) => void;
  period: Period;
  onPeriod: (p: Period) => void;
  from: string;
  to: string;
  onFrom: (d: string) => void;
  onTo: (d: string) => void;
  search: string;
  onSearch: (s: string) => void;
  active: boolean;
  onClear: () => void;
}

const venueChip = (on: boolean) => `shrink-0 cursor-pointer rounded-xl border px-3 py-2 text-left text-xs transition-colors ${on ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'}`;

/** Venue chips (each with its balance), the type switch, the period, and the search, with one "Clear" for all of them. */
export function HistoryFilters(p: HistoryFiltersProps) {
  return (
    <>
      {p.venues.length > 0 && (
        <div className="px-5 pb-3 sm:px-6">
          <div role="group" aria-label="Filter by venue" className="flex gap-2 overflow-x-auto pb-1">
            <button type="button" onClick={() => p.onVenue('')} aria-pressed={p.venueId === ''} className={venueChip(p.venueId === '')}>
              <span className="block font-semibold">All venues</span>
              <span className="block opacity-70">{p.venues.length} {p.venues.length === 1 ? 'venue' : 'venues'}</span>
            </button>
            {p.venues.map((v) => (
              <button key={v.id} type="button" onClick={() => p.onVenue(v.id)} aria-pressed={p.venueId === v.id} className={venueChip(p.venueId === v.id)}>
                <span className="block font-semibold">{v.name}{v.id === p.currentVenueId ? ' · here' : ''}</span>
                <span className="block opacity-70">Balance {inr(v.balance)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 px-5 pb-3 sm:px-6">
        <div role="group" aria-label="Filter by type" className="inline-flex rounded-xl bg-neutral-100 p-1">
          {TYPE_TABS.map((t) => (
            <button key={t.value} type="button" onClick={() => p.onType(t.value)} aria-pressed={p.type === t.value}
              className={`cursor-pointer rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${p.type === t.value ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="wallet-history-period">Period</label>
        <select id="wallet-history-period" value={p.period} onChange={(e) => p.onPeriod(e.target.value as Period)}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900">
          <option value="all">All time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="custom">Custom dates</option>
        </select>
        {p.period === 'custom' && (
          <>
            <label className="sr-only" htmlFor="wallet-history-from">From</label>
            <input id="wallet-history-from" type="date" value={p.from} max={p.to || istToday()} onChange={(e) => p.onFrom(e.target.value)} className="rounded-xl border border-neutral-200 px-2.5 py-1.5 text-xs" />
            <label className="sr-only" htmlFor="wallet-history-to">To</label>
            <input id="wallet-history-to" type="date" value={p.to} min={p.from || undefined} max={istToday()} onChange={(e) => p.onTo(e.target.value)} className="rounded-xl border border-neutral-200 px-2.5 py-1.5 text-xs" />
          </>
        )}
      </div>

      <div className="flex items-center gap-2 px-5 pb-4 sm:px-6">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input type="search" value={p.search} onChange={(e) => p.onSearch(e.target.value)} placeholder="Search table, order note or description"
            aria-label="Search history" maxLength={60}
            className="w-full rounded-xl border border-neutral-200 py-2 pl-8 pr-3 text-[16px] text-neutral-900 placeholder:text-neutral-400 sm:text-xs" />
        </div>
        {p.active && (
          <button type="button" onClick={p.onClear} className="inline-flex min-h-9 cursor-pointer items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-950">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>
    </>
  );
}

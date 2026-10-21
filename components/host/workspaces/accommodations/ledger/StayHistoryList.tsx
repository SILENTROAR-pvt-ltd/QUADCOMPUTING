'use client';

import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import type { HistoricalStayRecord } from '@/types';
import { StayHistoryRow } from './StayHistoryRow';

interface Props {
  stays: HistoricalStayRecord[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onOpen: (stay: HistoricalStayRecord) => void;
}

/** Every past stay, newest first. Tap one for the whole record: guest, ID, bill, orders, invoice. */
export function StayHistoryList({ stays, isLoading, hasActiveFilters, onClearFilters, onOpen }: Props) {
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white" aria-label="Stay history">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50/70 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h3 className="font-serif text-lg text-neutral-950">Past stays</h3>
          <p className="truncate text-xs text-neutral-500">Checked-out stays with their folio, invoice and orders.</p>
        </div>
        <span className="shrink-0 rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 font-mono text-xs text-neutral-600">{stays.length}</span>
      </div>

      {isLoading ? (
        <div className="space-y-px p-2" aria-busy="true">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-100/80" />)}
        </div>
      ) : stays.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-neutral-100 text-neutral-400"><FileSpreadsheet className="h-6 w-6" aria-hidden /></span>
          <p className="mt-3 font-serif text-base text-neutral-900">{hasActiveFilters ? 'No stays match' : 'No past stays yet'}</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
            {hasActiveFilters ? 'Try another name, room type or period.' : 'Every checkout from the front desk is recorded here with its invoice.'}
          </p>
          {hasActiveFilters && <button type="button" onClick={onClearFilters} className="mt-3 cursor-pointer text-xs font-semibold text-neutral-900 underline underline-offset-4">Clear filters</button>}
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {stays.map((stay) => <StayHistoryRow key={stay.id} stay={stay} onOpen={onOpen} />)}
        </ul>
      )}
    </section>
  );
}

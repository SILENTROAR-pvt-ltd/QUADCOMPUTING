'use client';

import React from 'react';
import type { HistoricalStayRecord } from '@/types';
import { StayHistoryTableRow } from './StayHistoryTableRow';
import { FileSpreadsheet } from 'lucide-react';

interface Props {
  stays: HistoricalStayRecord[];
  isLoading: boolean;
  searchQuery: string;
  selectedCategory: string;
  selectedTimeframe: string;
  onClearFilters: () => void;
  onSelectForInvoice: (stay: HistoricalStayRecord) => void;
}

export function StayHistoryTable({
  stays,
  isLoading,
  searchQuery,
  selectedCategory,
  selectedTimeframe,
  onClearFilters,
  onSelectForInvoice,
}: Props) {
  const hasActiveFilters = Boolean(searchQuery || selectedCategory !== 'ALL' || selectedTimeframe !== 'ALL');

  return (
    <div className="rounded-2xl border border-neutral-200/90 bg-white overflow-hidden shadow-2xs">
      {/* Table Title Bar */}
      <div className="border-b border-neutral-200/90 bg-neutral-50/60 px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg font-medium text-neutral-900 tracking-tight">
            Stay & Booking Audit Ledger
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Verified historical checkout logs, stay folios, and settled payments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-neutral-100 border border-neutral-200/80 px-2.5 py-0.5 text-xs font-mono font-medium text-neutral-600">
            {stays.length} Record{stays.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-neutral-500 flex flex-col items-center justify-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
          <span>Loading accommodation audit ledger...</span>
        </div>
      ) : stays.length === 0 ? (
        <div className="p-16 text-center text-neutral-500 space-y-3">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <p className="font-serif text-base font-medium text-neutral-800">No Past Stay Records Found</p>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
              {hasActiveFilters
                ? 'No stay logs match your active search or filter criteria. Try clearing filters.'
                : 'Completed guest checkouts from the Live Front Desk will automatically be recorded here for compliance, invoicing, and auditing.'}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="text-xs text-neutral-900 font-semibold underline underline-offset-4 hover:opacity-80 pt-2 cursor-pointer"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div
          className="overflow-x-auto scrollbar-none no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200/90 bg-neutral-50/80 text-[10px] uppercase font-bold tracking-wider text-neutral-500">
              <tr>
                <th className="py-3 px-6">Room & Category</th>
                <th className="py-3 px-4">Guest Details</th>
                <th className="py-3 px-4">Stay Duration</th>
                <th className="py-3 px-4">Occasion / Purpose</th>
                <th className="py-3 px-4">Settled Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6 text-right">Folio Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-normal text-neutral-700">
              {stays.map((stay) => (
                <StayHistoryTableRow
                  key={stay.id}
                  stay={stay}
                  onSelectForInvoice={onSelectForInvoice}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

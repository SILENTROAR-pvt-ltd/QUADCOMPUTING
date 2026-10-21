'use client';

import React from 'react';
import { ChevronDown, RefreshCw, Search } from 'lucide-react';
import type { RoomCategory } from '@/types';

interface Props {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  categories: RoomCategory[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  selectedTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
}

const control = 'h-10 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 outline-none transition-colors focus:border-neutral-900';

/** Find a past stay: by guest, phone or room, narrowed by room type and period. Stacks on a phone, one line on a desk. */
export function StayHistoryFilterBar(p: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-3 md:flex-row md:items-center">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Search past stays</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" aria-hidden />
        <input type="search" value={p.searchQuery} onChange={(e) => p.onSearchQueryChange(e.target.value)} placeholder="Guest, phone or room"
          className={`${control} w-full pl-8 pr-3 placeholder:text-neutral-400`} />
      </label>
      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1 md:flex-none">
          <span className="sr-only">Room type</span>
          <select value={p.selectedCategory} onChange={(e) => p.onCategoryChange(e.target.value)} className={`${control} w-full appearance-none pl-3 pr-8 font-semibold cursor-pointer`}>
            <option value="ALL">All room types</option>
            {p.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" aria-hidden />
        </label>
        <label className="relative min-w-0 flex-1 md:flex-none">
          <span className="sr-only">Period</span>
          <select value={p.selectedTimeframe} onChange={(e) => p.onTimeframeChange(e.target.value)} className={`${control} w-full appearance-none pl-3 pr-8 font-semibold cursor-pointer`}>
            <option value="ALL">All time</option>
            <option value="7_DAYS">Last 7 days</option>
            <option value="30_DAYS">Last 30 days</option>
            <option value="THIS_MONTH">This month</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" aria-hidden />
        </label>
        <button type="button" onClick={p.onRefresh} disabled={p.isRefreshing} aria-label="Refresh stay history"
          className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${p.isRefreshing ? 'animate-spin' : ''}`} aria-hidden />
        </button>
      </div>
    </div>
  );
}

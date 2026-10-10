'use client';

import React from 'react';
import type { RoomCategory, RoomStatus } from '@/types';
import { ChevronDown, Plus, RotateCw, Search } from 'lucide-react';
import { ROOM_STATUS_STYLE } from '../room-status-style';

type Filter = 'ALL' | RoomStatus;

interface Props {
  counts: Record<Filter, number>;
  statusFilter: Filter;
  onStatusFilterChange: (s: Filter) => void;
  categories: RoomCategory[];
  categoryFilter: string;
  onCategoryFilterChange: (id: string) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenAddUnit: () => void;
}

const FILTERS: Filter[] = ['ALL', 'VACANT', 'OCCUPIED', 'CLEANING', 'MAINTENANCE'];
const control = 'h-10 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 outline-none transition-colors focus:border-neutral-900';

/** Status filters, category, search, refresh and add-room for the front desk grid. */
export function FrontDeskToolbar(p: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
      <div role="tablist" aria-label="Room status" className="-mx-1 flex min-w-0 gap-1.5 overflow-x-auto px-1 pb-0.5 no-scrollbar">
        {FILTERS.map((f) => {
          const on = p.statusFilter === f;
          const style = f === 'ALL' ? null : ROOM_STATUS_STYLE[f];
          return (
            <button key={f} type="button" role="tab" aria-selected={on} onClick={() => p.onStatusFilterChange(f)}
              className={`flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors cursor-pointer ${on ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'}`}>
              {style && <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />}
              {style ? style.label : 'All rooms'}
              <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] ${on ? 'bg-white/15' : 'bg-neutral-100 text-neutral-500'}`}>{p.counts[f]}</span>
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-nowrap">
        <label className="relative shrink-0">
          <span className="sr-only">Room category</span>
          <select value={p.categoryFilter} onChange={(e) => p.onCategoryFilterChange(e.target.value)} className={`${control} appearance-none pl-3 pr-8 font-semibold cursor-pointer`}>
            <option value="ALL">All categories</option>
            {p.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
        </label>
        <label className="relative min-w-[160px] flex-1 2xl:w-60 2xl:flex-none">
          <span className="sr-only">Search rooms</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input type="search" placeholder="Room, guest or category" value={p.searchQuery} onChange={(e) => p.onSearchQueryChange(e.target.value)} className={`${control} w-full pl-8 pr-3 placeholder:text-neutral-400`} />
        </label>
        <button type="button" onClick={p.onRefresh} disabled={p.isRefreshing} aria-label="Refresh rooms"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-60 cursor-pointer">
          <RotateCw className={`h-4 w-4 ${p.isRefreshing ? 'animate-spin' : ''}`} />
        </button>
        <button type="button" onClick={p.onOpenAddUnit} className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-neutral-950 px-4 text-xs font-semibold text-white hover:bg-neutral-800 cursor-pointer">
          <Plus className="h-4 w-4" /> Add room
        </button>
      </div>
    </div>
  );
}

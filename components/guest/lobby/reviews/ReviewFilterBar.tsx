'use client';

import React from 'react';
import { ArrowDownUp } from 'lucide-react';
import type { ReviewFilterOption, ReviewSortOption } from './review.types';

const BASE: Array<{ id: ReviewFilterOption; label: string }> = [
  { id: 'all', label: 'All' },
  { id: '5star', label: '5 ★' },
  { id: '4star', label: '4 ★' },
  { id: '3below', label: '≤ 3 ★' },
];

interface ReviewFilterBarProps {
  filter: ReviewFilterOption;
  onFilter: (f: ReviewFilterOption) => void;
  sort: ReviewSortOption;
  onSort: () => void;
  /** A "Photos" filter appears only when some review has photos. */
  hasPhotos: boolean;
}

/** The rating filters (a swipeable pill row) and the newest / top-rated switch. */
export function ReviewFilterBar({ filter, onFilter, sort, onSort, hasPhotos }: ReviewFilterBarProps) {
  const filters = hasPhotos ? [...BASE, { id: 'photos' as const, label: 'Photos' }] : BASE;
  return (
    <div className="flex items-center gap-2">
      <div role="tablist" aria-label="Filter reviews" className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-full border border-[#e8dfcc] bg-[#fbf9f4] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((f) => (
          <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => onFilter(f.id)}
            className={`h-9 shrink-0 cursor-pointer rounded-full px-3.5 text-[12.5px] font-semibold transition-colors duration-300 ${filter === f.id ? 'bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] text-[#f5f1e8]' : 'text-[#10231a]/55 active:bg-[#efe7d6]'}`}>
            {f.label}
          </button>
        ))}
      </div>
      <button type="button" onClick={onSort}
        aria-label={sort === 'latest' ? 'Showing newest first. Show top rated first' : 'Showing top rated first. Show newest first'}
        className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[#e8dfcc] bg-[#fbf9f4] px-3.5 text-[12px] font-semibold text-[#10231a]/75 active:scale-95">
        <ArrowDownUp className="h-3.5 w-3.5" aria-hidden /> {sort === 'latest' ? 'Newest' : 'Top rated'}
      </button>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import type { KitchenStatusFilterBarProps, KOTFilter } from './types';

export function KitchenStatusFilterBar({
  filter,
  onFilterChange,
  searchQuery,
  onSearchQueryChange,
  totalCount,
  pendingCount,
  preparingCount,
  readyCount,
  deliveredCount,
}: KitchenStatusFilterBarProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const tabs: { key: KOTFilter; label: string; count: number }[] = [
    { key: 'ALL', label: 'All Orders', count: isMounted ? totalCount : 0 },
    { key: 'PENDING', label: 'Pending', count: isMounted ? pendingCount : 0 },
    { key: 'PREPARING', label: 'Cooking', count: isMounted ? preparingCount : 0 },
    { key: 'READY', label: 'Ready', count: isMounted ? readyCount : 0 },
    { key: 'DELIVERED', label: 'Delivered', count: isMounted ? deliveredCount : 0 },
  ];

  return (
    <div className="mb-6 flex flex-col xl:flex-row xl:items-center justify-between gap-3 rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-xs">
      {/* Status Tabs - Aligned Equal Rectangular Shape */}
      <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5">
        {tabs.map((st) => {
          const isSelected = filter === st.key;
          return (
            <button
              key={st.key}
              type="button"
              onClick={() => onFilterChange(st.key)}
              className={`h-10 min-w-[114px] px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap flex items-center justify-between gap-2.5 cursor-pointer border ${
                isSelected
                  ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs font-bold'
                  : 'bg-white border-zinc-200/90 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
              }`}
            >
              <span>{st.label}</span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                  isSelected
                    ? 'bg-zinc-800 text-zinc-200'
                    : 'bg-zinc-100 text-zinc-600 border border-zinc-200/60'
                }`}
              >
                {st.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right Search Tool */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
        <input
          type="text"
          placeholder="Search room, table, ticket, dish..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="h-10 w-full sm:w-64 rounded-xl border border-zinc-200/90 bg-white pl-8 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 hover:border-zinc-300 transition-all shadow-2xs"
        />
      </div>
    </div>
  );
}

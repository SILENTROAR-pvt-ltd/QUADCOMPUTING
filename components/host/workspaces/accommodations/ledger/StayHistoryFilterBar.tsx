'use client';

import React from 'react';
import type { RoomCategory } from '@/types';
import { Search, RefreshCw, ChevronDown } from 'lucide-react';

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

export function StayHistoryFilterBar({
  searchQuery,
  onSearchQueryChange,
  categories,
  selectedCategory,
  onCategoryChange,
  selectedTimeframe,
  onTimeframeChange,
  isRefreshing,
  onRefresh,
}: Props) {
  return (
    <div className="rounded-2xl border border-neutral-200/90 bg-white p-3 shadow-2xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Box */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search past guest by name, phone, or room..."
            className="w-full h-9.5 rounded-xl border border-neutral-200/90 bg-white pl-9 pr-4 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-all shadow-2xs"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="h-9.5 appearance-none rounded-xl border border-neutral-200/90 bg-white pl-3.5 pr-8 text-xs font-semibold text-neutral-700 focus:outline-none focus:border-neutral-900 hover:border-neutral-300 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          </div>

          {/* Timeframe Dropdown */}
          <div className="relative">
            <select
              value={selectedTimeframe}
              onChange={(e) => onTimeframeChange(e.target.value)}
              className="h-9.5 appearance-none rounded-xl border border-neutral-200/90 bg-white pl-3.5 pr-8 text-xs font-semibold text-neutral-700 focus:outline-none focus:border-neutral-900 hover:border-neutral-300 transition-all cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Time</option>
              <option value="7_DAYS">Last 7 Days</option>
              <option value="30_DAYS">Last 30 Days</option>
              <option value="THIS_MONTH">This Month</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh Stay Ledger"
            className="flex items-center justify-center h-9.5 w-9.5 rounded-xl border border-neutral-200/90 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

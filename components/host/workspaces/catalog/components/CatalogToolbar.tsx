'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

/** 'category:Quick Bites' filters to one of the venue's own food categories. */
export type FilterCategory = 'All' | 'food_beverage' | 'accommodation' | 'service' | `category:${string}`;
export type SortOption = 'A-Z' | 'Z-A' | 'Price-Low-High' | 'Price-High-Low';

interface CatalogToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterCategory: FilterCategory;
  onFilterChange: (cat: FilterCategory) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  hasAccommodationEnabled: boolean;
}

export const CatalogToolbar = React.memo<CatalogToolbarProps>(function CatalogToolbar({
  searchQuery,
  onSearchChange,
  filterCategory,
  onFilterChange,
  sortOption,
  onSortChange,
}) {
  const pills: { label: string; value: FilterCategory }[] = [
    { label: 'All', value: 'All' },
    { label: 'Food & Bev', value: 'food_beverage' },
    { label: 'Accommodations', value: 'accommodation' },
    { label: 'Services', value: 'service' },
  ];

  return (
    <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-neutral-200/90 bg-neutral-50/70 p-3 sm:p-3.5 shadow-2xs">
      {/* Search Input Bar */}
      <div className="relative w-full sm:w-72 lg:w-80 flex-shrink-0">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4 pointer-events-none" />
        <input
          type="text"
          placeholder="Search items by name or description..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-xl border border-neutral-200/90 bg-white py-2.5 pl-10 pr-9 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 shadow-2xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
            aria-label="Clear search query"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category Filter Pills (Apple Segmented Style) */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none w-full sm:w-auto py-0.5 justify-start sm:justify-center">
        {pills.map((pill) => {
          const isActive = filterCategory === pill.value;
          return (
            <button
              key={pill.value}
              type="button"
              onClick={() => onFilterChange(pill.value)}
              className={`whitespace-nowrap flex-shrink-0 rounded-xl px-3.5 py-2 text-xs sm:text-[13px] font-medium transition-all duration-150 cursor-pointer select-none ${
                isActive
                  ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                  : 'border border-neutral-200/90 bg-white text-neutral-600 hover:text-neutral-900 hover:border-neutral-300 shadow-2xs'
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Sort Dropdown */}
      <div className="w-full sm:w-auto flex-shrink-0">
        <select
          value={sortOption}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="w-full sm:w-auto cursor-pointer appearance-none rounded-xl border border-neutral-200/90 bg-white py-2 pl-3.5 pr-9 text-xs sm:text-[13px] font-medium text-neutral-700 shadow-2xs transition-colors hover:border-neutral-300 focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
            backgroundSize: '14px',
          }}
        >
          <option value="A-Z">Sort: A to Z</option>
          <option value="Z-A">Sort: Z to A</option>
          <option value="Price-Low-High">Price: Low to High</option>
          <option value="Price-High-Low">Price: High to Low</option>
        </select>
      </div>
    </div>
  );
});

export default CatalogToolbar;

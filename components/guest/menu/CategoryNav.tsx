'use client';

import React from 'react';
import { X } from 'lucide-react';

interface CategoryNavProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div>
      {/* Search Input */}
      <div className="relative my-3">
        <input
          type="text"
          placeholder="Search dishes, pairings, roasts..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full border-b border-zinc-200 bg-transparent min-h-[40px] pb-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-black focus:outline-none transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-0 top-2 text-zinc-400 hover:text-black cursor-pointer"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Top Horizontal Category Bar */}
      <div className="flex items-center gap-5 sm:gap-7 overflow-x-auto no-scrollbar scrollbar-none snap-x snap-mandatory touch-pan-x border-b border-zinc-200/70 pb-2.5 mb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`snap-start text-sm tracking-tight transition-colors whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'font-medium text-black border-b-2 border-black -mb-[13px] pb-2.5'
                  : 'text-zinc-500 hover:text-zinc-900 font-light'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
};

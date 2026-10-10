"use client";

import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

interface DiningFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  /** Dish counts keyed by lower-cased category; "dining" is every dish. */
  counts?: Record<string, number>;
  /** Dishes matching the current search and category. */
  shownCount?: number;
}

// "Dining" is the all-dishes filter value; guests see it named for what it does.
const ALL = "Dining";
const label = (cat: string) => (cat === ALL ? "All dishes" : cat);
const key = (cat: string) => cat.trim().toLowerCase();

/**
 * The menu's filter bar: search and category chips, kept in view while the guest scrolls.
 * The active category is brought into the middle of the chip row, so it is always visible.
 */
export function DiningFilters({
  searchQuery,
  setSearchQuery,
  categories,
  selectedCategory,
  onSelectCategory,
  counts,
  shownCount,
}: DiningFiltersProps) {
  const rail = useRef<HTMLDivElement>(null);
  const activeChip = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const box = rail.current;
    const chip = activeChip.current;
    if (!box || !chip) return;
    box.scrollTo({ left: Math.max(0, chip.offsetLeft - (box.clientWidth - chip.offsetWidth) / 2), behavior: "smooth" });
  }, [selectedCategory]);

  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-zinc-200/60 bg-[#faf9f6]/90 px-4 pb-2.5 pt-2 backdrop-blur-xl sm:mx-0 sm:px-0">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
          <Search size={15} />
        </span>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search dishes, drinks, desserts"
          aria-label="Search the menu"
          className="h-10 w-full rounded-xl border border-zinc-200/80 bg-white pl-10 pr-20 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-xs transition-all focus:border-emerald-800/40 focus:outline-none focus:shadow-[0_8px_24px_-14px_rgba(16,185,129,0.6)]"
        />
        <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
          {searchQuery && (
            <>
              <span className="text-[11px] tabular-nums text-zinc-500">{shownCount ?? 0} found</span>
              <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search"
                className="grid h-6 w-6 place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer">
                <X size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      <div
        ref={rail}
        role="group"
        aria-label="Menu categories"
        className="relative mt-2.5 flex items-center gap-1.5 overflow-x-auto scroll-smooth pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: "linear-gradient(to right, black calc(100% - 32px), transparent)", WebkitMaskImage: "linear-gradient(to right, black calc(100% - 32px), transparent)" }}
      >
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          const count = counts?.[key(cat)];
          return (
            <button
              key={cat}
              ref={isActive ? activeChip : undefined}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelectCategory(cat)}
              className={`inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-xs font-medium transition-all active:scale-95 ${
                isActive
                  ? "bg-[#0A3222] text-white shadow-[0_6px_16px_-8px_rgba(10,50,34,0.8)]"
                  : "border border-zinc-200/70 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
              }`}
            >
              {label(cat)}
              {count !== undefined && (
                <span className={`tabular-nums text-[10px] ${isActive ? "text-emerald-200" : "text-zinc-400"}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default DiningFilters;

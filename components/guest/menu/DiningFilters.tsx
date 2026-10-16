"use client";

import { SearchField } from "./filters/SearchField";
import { CategoryRail } from "./filters/CategoryRail";

interface DiningFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  /** Dish counts keyed by lower-cased category; "dining" is every dish. */
  counts?: Record<string, number>;
  /** A dish photo for each category, keyed by lower-cased category; "dining" is the all-dishes chip. */
  covers?: Record<string, string>;
  /** Dishes matching the current search. */
  shownCount?: number;
}

/** The menu's filter bar: search, and the categories as photos of their own dishes. A chip scrolls the page to its section. */
export function DiningFilters({ searchQuery, setSearchQuery, categories, selectedCategory, onSelectCategory, counts, covers, shownCount }: DiningFiltersProps) {
  return (
    <div className="space-y-2.5">
      <SearchField value={searchQuery} onChange={setSearchQuery} shownCount={shownCount} />
      <CategoryRail categories={categories} selectedCategory={selectedCategory} onSelect={onSelectCategory} counts={counts} covers={covers} />
    </div>
  );
}

export default DiningFilters;

'use client';

import React, { useMemo } from 'react';
import type { CatalogItem } from '@/types';
import { isFoodBeverageEntity } from '@/lib/utils/catalog-item';
import { sortCulinaryCategories } from '@/lib/utils/menu-categories';
import type { FilterCategory } from './CatalogToolbar';

interface CatalogCategoryChipsProps {
  items: CatalogItem[];
  value: FilterCategory;
  onChange: (value: FilterCategory) => void;
}

/**
 * The venue's own food categories, with how many dishes each holds. Same names and order as the
 * guest menu. Shows nothing until a dish has a category.
 */
export function CatalogCategoryChips({ items, value, onChange }: CatalogCategoryChipsProps) {
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (!isFoodBeverageEntity(item)) continue;
      const name = String((item as any).category || '').trim();
      if (name) counts.set(name, (counts.get(name) || 0) + 1);
    }
    return sortCulinaryCategories(new Set(counts.keys())).map((name) => ({ name, count: counts.get(name) || 0 }));
  }, [items]);

  if (categories.length === 0) return null;

  return (
    <div role="group" aria-label="Menu categories" className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {categories.map(({ name, count }) => {
        const key: FilterCategory = `category:${name}`;
        const active = value === key;
        return (
          <button
            key={name}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? 'food_beverage' : key)}
            className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              active ? 'bg-neutral-900 text-white' : 'border border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'
            }`}
          >
            {name}
            <span className={`tabular-nums text-[10px] ${active ? 'text-neutral-300' : 'text-neutral-400'}`}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

export default CatalogCategoryChips;

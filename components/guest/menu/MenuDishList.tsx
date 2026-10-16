'use client';

import React, { useCallback, useMemo, useRef } from 'react';
import { DiningFilters } from './DiningFilters';
import { DiningFeed, type DishLikesView } from './DiningFeed';
import { useCategorySpy } from './hooks/useCategorySpy';
import { useOpenCategories } from './hooks/useOpenCategories';
import { categoryCovers } from '@/lib/guest/category-covers';
import type { GuestMenuState } from './hooks/useGuestMenuState';

const ALL = 'Dining';

/**
 * The dishes with their sticky filter bar. The chips scroll the page to a category and light up as the guest scrolls past
 * one; a search narrows the page to the matching dishes. The bar sticks only while the dishes are on screen.
 */
export function MenuDishList({ state, likes }: { state: GuestMenuState; likes?: DishLikesView }) {
  const bar = useRef<HTMLDivElement>(null);
  const { diningItems, filteredDiningItems, searchQuery, setSearchQuery, culinaryCategories, selectedCategory, setSelectedCategory } = state;
  const searching = searchQuery.trim().length > 0;
  const bars = useOpenCategories();

  // The sections' order is the chips' order (without the "all dishes" chip).
  const order = useMemo(() => culinaryCategories.filter((c: string) => c !== ALL), [culinaryCategories]);
  const { jump } = useCategorySpy({ categories: order, enabled: !searching, stickyRef: bar, onActive: setSelectedCategory });

  const counts = useMemo(() => {
    const out: Record<string, number> = { dining: diningItems.length };
    for (const item of diningItems) {
      const k = (item.category || '').trim().toLowerCase();
      out[k] = (out[k] || 0) + 1;
    }
    return out;
  }, [diningItems]);
  const covers = useMemo(() => categoryCovers(diningItems), [diningItems]);

  // A chip opens its bar (the all-dishes chip opens none) and glides to it. During a search it first leaves the search.
  const select = useCallback((cat: string) => {
    if (cat !== ALL) bars.open(cat);
    if (!searching) return jump(cat);
    setSearchQuery('');
    setSelectedCategory(cat);
    requestAnimationFrame(() => requestAnimationFrame(() => jump(cat)));
  }, [searching, jump, bars, setSearchQuery, setSelectedCategory]);

  return (
    <div id="menu-dishes" className="space-y-4 sm:space-y-5">
      <div ref={bar} className="sticky top-0 z-30 -mx-4 bg-[#faf9f6]/[0.97] px-4 pb-2 pt-1 sm:-mx-6 sm:px-6">
        <DiningFilters
          searchQuery={searchQuery} setSearchQuery={setSearchQuery} categories={culinaryCategories}
          selectedCategory={selectedCategory} onSelectCategory={select} counts={counts} covers={covers}
          shownCount={filteredDiningItems.length}
        />
      </div>
      <DiningFeed
        items={filteredDiningItems} isLoading={state.isLoadingMenu} categoryOrder={order}
        getItemCartQuantity={state.getItemCartQuantity} onIncrement={state.handleItemIncrement}
        onDecrement={state.handleItemDecrement} onOpenCustomization={state.handleOpenCustomization}
        onQuickAdd={state.handleQuickAdd} likes={likes} searchActive={searching}
        opened={bars.opened} onToggle={bars.toggle} onOpenAll={bars.openAll} onCloseAll={bars.closeAll}
      />
    </div>
  );
}

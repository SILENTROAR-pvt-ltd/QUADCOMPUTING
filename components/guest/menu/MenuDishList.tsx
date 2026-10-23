'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { DiningFilters } from './DiningFilters';
import { dietChoices, type DietFilter } from '@/lib/guest/diet-filter';
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
  const { diningItems, dietItems, filteredDiningItems, searchQuery, setSearchQuery, culinaryCategories, selectedCategory, setSelectedCategory, dietFilter, setDietFilter } = state;
  const searching = searchQuery.trim().length > 0;
  const bars = useOpenCategories();

  // Counts, covers and chips follow the chosen diet: under Veg a category with no veg dish is not offered.
  const counts = useMemo(() => {
    const out: Record<string, number> = { dining: dietItems.length };
    for (const item of dietItems) {
      const k = (item.category || '').trim().toLowerCase();
      out[k] = (out[k] || 0) + 1;
    }
    return out;
  }, [dietItems]);
  const covers = useMemo(() => categoryCovers(dietItems), [dietItems]);
  const categories = useMemo(() => culinaryCategories.filter((c: string) => c === ALL || counts[c.trim().toLowerCase()] > 0), [culinaryCategories, counts]);
  const choices = useMemo(() => dietChoices(diningItems), [diningItems]);

  // The sections' order is the chips' order (without the "all dishes" chip).
  const order = useMemo(() => categories.filter((c: string) => c !== ALL), [categories]);
  const { jump } = useCategorySpy({ categories: order, enabled: !searching, stickyRef: bar, onActive: setSelectedCategory });

  // A diet the menu no longer has (the venue changed it) falls back to every dish.
  useEffect(() => {
    if (dietFilter !== 'all' && !choices.some((c) => c.diet === dietFilter)) setDietFilter('all');
  }, [choices, dietFilter, setDietFilter]);

  // A new diet starts the guest at the top of the dishes, where the narrowed list begins.
  const chooseDiet = useCallback((next: DietFilter) => {
    setDietFilter(next);
    setSelectedCategory(ALL);
    requestAnimationFrame(() => {
      const top = document.getElementById('menu-dishes');
      if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start' });
    });
  }, [setDietFilter, setSelectedCategory]);

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
      <div ref={bar} className="sticky top-0 z-30 -mx-4 bg-[#f5f1e8]/95 px-4 pb-2 pt-2 shadow-[0_14px_24px_-26px_rgba(16,35,26,0.6)] sm:-mx-6 sm:px-6">
        <DiningFilters
          searchQuery={searchQuery} setSearchQuery={setSearchQuery} categories={categories}
          selectedCategory={selectedCategory} onSelectCategory={select} counts={counts} covers={covers}
          shownCount={filteredDiningItems.length}
          diet={{ choices, total: diningItems.length, value: dietFilter, onChange: chooseDiet }}
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

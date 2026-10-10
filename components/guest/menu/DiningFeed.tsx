'use client';

import React, { useMemo, useState } from 'react';
import { MenuItem } from './types';
import { RecipeCubeCard, type DishLikesView } from './RecipeCubeCard';
import { MenuCategorySection } from './MenuCategorySection';

export type { DishLikesView } from './RecipeCubeCard';

// Larger tiles: two across on a phone, three from tablet up.
const GRID = 'grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-5';
const chip = 'rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 cursor-pointer';

interface DiningFeedProps {
  items: MenuItem[];
  isLoading: boolean;
  getItemCartQuantity: (id: string) => number;
  onIncrement?: (item: MenuItem) => void;
  onDecrement?: (item: MenuItem) => void;
  onOpenCustomization?: (item: MenuItem) => void;
  onQuickAdd?: (item: MenuItem) => void;
  likes?: DishLikesView;
  /** True while the guest is searching: matching dishes are shown without opening each category. */
  searchActive?: boolean;
}

export const DiningFeed: React.FC<DiningFeedProps> = ({
  items,
  isLoading,
  getItemCartQuantity,
  onIncrement,
  onDecrement,
  onOpenCustomization,
  onQuickAdd,
  likes,
  searchActive,
}) => {
  // Categories are closed until the guest opens them.
  const [opened, setOpened] = useState<Set<string>>(() => new Set());
  const toggleOpen = (cat: string) => setOpened((prev) => {
    const next = new Set(prev);
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    return next;
  });

  // Group items by category, keeping the order they arrive in.
  const categoryGroups = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    items.forEach((item) => {
      const cat = item.category || 'Culinary Creations';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    });
    return Array.from(map, ([category, items]) => ({ category, items }));
  }, [items]);

  if (isLoading) {
    return (
      <div className={`${GRID} mb-8 pt-1`}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex animate-pulse flex-col rounded-2xl border border-[#E4D5B0]/70 bg-white p-3">
            <div className="mb-2 aspect-square w-full rounded-xl bg-[#F6EFDD]" />
            <div className="space-y-1.5 px-0.5 pb-1">
              <div className="h-3.5 w-3/4 rounded bg-[#F6EFDD]" />
              <div className="h-2.5 w-1/2 rounded bg-[#F6EFDD]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="my-2 rounded-2xl border border-dashed border-[#E4D5B0] bg-white p-6 py-16 text-center">
        <p className="mb-1 font-serif text-base text-zinc-900 sm:text-lg" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          No Culinary Selections Found
        </p>
        <p className="text-[11px] font-light uppercase tracking-wide text-zinc-400">Select another category or adjust your search filter</p>
      </div>
    );
  }

  const handleItemIncrement = (item: MenuItem) => {
    if (onIncrement) {
      onIncrement(item);
    } else {
      const hasOptions = (item.item_options && item.item_options.length > 0) || (item.options && item.options.length > 0);
      const qty = getItemCartQuantity(item.id);
      if (hasOptions && qty === 0 && onOpenCustomization) onOpenCustomization(item);
      else if (onQuickAdd) onQuickAdd(item);
    }
  };
  const handleItemDecrement = (item: MenuItem) => { if (onDecrement) onDecrement(item); };

  // One category (chosen from the filter bar) or an active search shows its dishes straight away.
  const isOpen = (cat: string) => categoryGroups.length === 1 || Boolean(searchActive) || opened.has(cat);
  const showExpandControls = categoryGroups.length > 1 && !searchActive;

  const renderDish = (item: MenuItem) => (
    <RecipeCubeCard
      key={item.id}
      item={item}
      cartQuantity={getItemCartQuantity(item.id)}
      onIncrement={handleItemIncrement}
      onDecrement={handleItemDecrement}
      likes={likes}
    />
  );

  return (
    <div className="space-y-3">
      {showExpandControls && (
        <div className="flex items-center justify-between px-1 pb-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#8A7040]">{categoryGroups.length} categories</p>
          <div className="flex gap-1.5">
            <button type="button" className={chip} onClick={() => setOpened(new Set(categoryGroups.map((g) => g.category)))}>Open all</button>
            <button type="button" className={chip} onClick={() => setOpened(new Set())}>Close all</button>
          </div>
        </div>
      )}

      {categoryGroups.map(({ category, items: categoryItems }) =>
        categoryGroups.length === 1 ? (
          <div key={category} className={GRID}>{categoryItems.map(renderDish)}</div>
        ) : (
          <MenuCategorySection
            key={category}
            title={category}
            count={categoryItems.length}
            image={categoryItems.find((i) => i.image_url)?.image_url ?? null}
            open={isOpen(category)}
            onToggle={() => toggleOpen(category)}
          >
            <div className={GRID}>{categoryItems.map(renderDish)}</div>
          </MenuCategorySection>
        ),
      )}
    </div>
  );
};

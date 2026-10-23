'use client';

import React, { useCallback, useMemo, useRef } from 'react';
import { MenuItem } from './types';
import { RecipeCubeCard, type DishLikesView } from './RecipeCubeCard';
import { MenuCategorySection } from './MenuCategorySection';
import { DISH_GRID, DishSkeletons, NoDishes } from './DiningFeedStates';
import { categoryKey } from './hooks/useCategorySpy';

export type { DishLikesView } from './RecipeCubeCard';

interface DiningFeedProps {
  items: MenuItem[];
  isLoading: boolean;
  /** The categories in the order the filter chips show them, so the page and the chips agree on A to Z. */
  categoryOrder: string[];
  getItemCartQuantity: (id: string) => number;
  onIncrement?: (item: MenuItem) => void;
  onDecrement?: (item: MenuItem) => void;
  onOpenCustomization?: (item: MenuItem) => void;
  onQuickAdd?: (item: MenuItem) => void;
  likes?: DishLikesView;
  /** True while the guest is searching: matching dishes are one flat list, not sections. */
  searchActive?: boolean;
  /** Which category bars are open (by lower-cased name), and how the feed changes that. */
  opened: ReadonlySet<string>;
  onToggle: (category: string) => void;
  onOpenAll: (categories: string[]) => void;
  onCloseAll: () => void;
}

/** The first few tiles load their photos at once so the top of the menu is never grey. */
const EAGER = 4;
const CHIP = 'cursor-pointer rounded-full border border-[#e8dfcc] bg-[#fbf9f4] px-3.5 py-2 text-[11px] font-medium text-[#10231a]/70 transition-colors hover:border-[#b08d57]/60 hover:text-[#10231a] active:scale-95';

/**
 * The menu as a list of category bars, in the same order as the chips (which open and scroll to them, and follow along as the
 * page moves). A bar opens to its dishes. A search shows the matching dishes as one list.
 */
export function DiningFeed({ items, isLoading, categoryOrder, getItemCartQuantity, onIncrement, onDecrement, onOpenCustomization, onQuickAdd, likes, searchActive, opened, onToggle, onOpenAll, onCloseAll }: DiningFeedProps) {
  // Handlers are read from a ref, so the dish tiles get stable functions and only the tapped dish re-renders.
  const latest = useRef({ onIncrement, onDecrement, onOpenCustomization, onQuickAdd, getItemCartQuantity });
  latest.current = { onIncrement, onDecrement, onOpenCustomization, onQuickAdd, getItemCartQuantity };

  const increment = useCallback((item: MenuItem) => {
    const h = latest.current;
    if (h.onIncrement) return h.onIncrement(item);
    const hasOptions = Boolean(item.item_options?.length || item.options?.length);
    if (hasOptions && h.getItemCartQuantity(item.id) === 0 && h.onOpenCustomization) h.onOpenCustomization(item);
    else h.onQuickAdd?.(item);
  }, []);
  const decrement = useCallback((item: MenuItem) => latest.current.onDecrement?.(item), []);

  const groups = useMemo(() => {
    const order = new Map(categoryOrder.map((c, i) => [categoryKey(c), i]));
    const map = new Map<string, MenuItem[]>();
    for (const item of items) {
      const cat = item.category || 'Culinary Creations';
      map.set(cat, [...(map.get(cat) ?? []), item]);
    }
    return Array.from(map, ([category, list]) => ({ category, items: list }))
      .sort((a, b) => (order.get(categoryKey(a.category)) ?? 1e6) - (order.get(categoryKey(b.category)) ?? 1e6));
  }, [items, categoryOrder]);

  if (isLoading) return <DishSkeletons />;
  if (items.length === 0) return <NoDishes searching={Boolean(searchActive)} />;

  let shown = 0;
  const tile = (item: MenuItem) => (
    <RecipeCubeCard key={item.id} item={item} cartQuantity={getItemCartQuantity(item.id)}
      onIncrement={increment} onDecrement={decrement} likes={likes} priority={shown++ < EAGER} />
  );

  if (searchActive || groups.length === 1) return <div className={DISH_GRID}>{items.map(tile)}</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1 pb-1">
        <p className="flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8a6d3f] before:h-px before:w-6 before:bg-[#b08d57]">{groups.length} categories</p>
        <div className="flex gap-1.5">
          <button type="button" className={CHIP} onClick={() => onOpenAll(groups.map((g) => g.category))}>Open all</button>
          <button type="button" className={CHIP} onClick={onCloseAll}>Close all</button>
        </div>
      </div>
      {groups.map(({ category, items: list }) => (
        <MenuCategorySection key={category} title={category} count={list.length} image={list.find((i) => i.image_url)?.image_url ?? null}
          open={opened.has(categoryKey(category))} onToggle={() => onToggle(category)}>
          <div className={DISH_GRID}>{list.map(tile)}</div>
        </MenuCategorySection>
      ))}
    </div>
  );
}

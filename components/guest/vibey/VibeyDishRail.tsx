'use client';

import React from 'react';
import type { MenuItem } from '@/components/guest/menu/types';
import { VibeyDishCard } from './VibeyDishCard';
import { VibeyDishTile } from './VibeyDishTile';

interface VibeyDishRailProps {
  items: MenuItem[];
  quantityOf: (itemId: string) => number;
  onIncrement: (item: MenuItem) => void;
  onDecrement: (item: MenuItem) => void;
}

/** The dishes Vibey points at: one as a full-width row, several as a swipeable row of equal tiles that snap into place. */
export function VibeyDishRail({ items, quantityOf, onIncrement, onDecrement }: VibeyDishRailProps) {
  if (items.length === 1) {
    return <VibeyDishCard item={items[0]} quantity={quantityOf(items[0].id)} onIncrement={onIncrement} onDecrement={onDecrement} />;
  }
  return (
    <div>
      <div role="list" aria-label={`${items.length} dishes`}
        className="no-scrollbar -mr-4 flex snap-x snap-mandatory items-stretch gap-2.5 overflow-x-auto scroll-smooth pb-2 pr-4 [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)]">
        {items.map((item) => (
          <div key={item.id} role="listitem" className="shrink-0 snap-start">
            <VibeyDishTile item={item} quantity={quantityOf(item.id)} onIncrement={onIncrement} onDecrement={onDecrement} />
          </div>
        ))}
      </div>
      {items.length > 2 && <p className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.18em] text-[#a8987a]">{items.length} dishes · swipe for more</p>}
    </div>
  );
}

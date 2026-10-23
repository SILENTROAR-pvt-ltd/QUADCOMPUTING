'use client';

import React from 'react';
import { DishImage } from '@/components/guest/menu/DishImage';
import { DishAddControl } from '@/components/guest/menu/DishAddControl';
import { ItemVegMark } from '@/components/guest/menu/cards/VegMark';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import { rupees } from '@/lib/guest/cashback';
import type { MenuItem } from '@/components/guest/menu/types';

interface VibeyDishTileProps {
  item: MenuItem;
  quantity: number;
  onIncrement: (item: MenuItem) => void;
  onDecrement: (item: MenuItem) => void;
}

/**
 * One dish in a swipeable row, dressed like the menu: a square photo with the menu's own forest + / − stepper on it, the
 * diet mark, the name in the serif and the price in gold. Every tile is the same size.
 */
export function VibeyDishTile({ item, quantity, onIncrement, onDecrement }: VibeyDishTileProps) {
  return (
    <div className="flex h-full w-[156px] flex-col overflow-hidden rounded-[20px] border border-[#e8dfcc] bg-[#fffdf8] shadow-[0_16px_32px_-26px_rgba(16,35,26,0.6)]">
      <div className="relative aspect-square w-full overflow-hidden bg-[#efe7d6]">
        <DishImage src={item.image_url} name={item.name} />
        <span className="absolute left-2 top-2"><ItemVegMark item={item} /></span>
        <span className="absolute bottom-2 right-2">
          <DishAddControl name={item.name} quantity={quantity} onIncrement={() => onIncrement(item)} onDecrement={() => onDecrement(item)} />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-2.5">
        <p style={LUXE_SERIF} className="line-clamp-2 min-h-[38px] text-[16px] font-semibold leading-[19px] text-[#10231a]">{item.name}</p>
        <span className="mt-auto text-[13px] font-semibold tabular-nums text-[#8a6d3f]">{rupees(Number(item.price) || 0)}</span>
      </div>
    </div>
  );
}

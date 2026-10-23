'use client';

import React from 'react';
import { DishImage } from '@/components/guest/menu/DishImage';
import { DishAddControl } from '@/components/guest/menu/DishAddControl';
import { ItemVegMark } from '@/components/guest/menu/cards/VegMark';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import { rupees } from '@/lib/guest/cashback';
import type { MenuItem } from '@/components/guest/menu/types';

interface VibeyDishCardProps {
  item: MenuItem;
  quantity: number;
  onIncrement: (item: MenuItem) => void;
  onDecrement: (item: MenuItem) => void;
}

/** A single dish Vibey points at, drawn from the guest's own menu: square photo, serif name, gold price, the menu's − / +. */
export function VibeyDishCard({ item, quantity, onIncrement, onDecrement }: VibeyDishCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-[#e8dfcc] bg-[#fffdf8] p-2 pr-3 shadow-[0_16px_32px_-26px_rgba(16,35,26,0.6)]">
      <div className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-2xl bg-[#efe7d6]">
        <DishImage src={item.image_url} name={item.name} />
      </div>
      <div className="min-w-0 flex-1">
        <p style={LUXE_SERIF} className="line-clamp-2 text-[17px] font-semibold leading-tight text-[#10231a]">{item.name}</p>
        <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold tabular-nums text-[#8a6d3f]">
          <ItemVegMark item={item} className="!h-[15px] !w-[15px]" /> {rupees(Number(item.price) || 0)}
        </p>
      </div>
      <DishAddControl name={item.name} quantity={quantity} onIncrement={() => onIncrement(item)} onDecrement={() => onDecrement(item)} />
    </div>
  );
}

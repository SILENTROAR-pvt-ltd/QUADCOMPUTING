'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { DishImage } from '@/components/guest/menu/DishImage';
import { press } from '@/components/guest/menu/motion';
import { rupees } from '@/lib/guest/cashback';
import type { MenuItem } from '@/components/guest/menu/types';

interface VibeyDishTileProps {
  item: MenuItem;
  quantity: number;
  onIncrement: (item: MenuItem) => void;
  onDecrement: (item: MenuItem) => void;
}

/** One dish in a swipeable row: photo, a two-line name, price, and the menu's own + / stepper. Every tile is the same size. */
export function VibeyDishTile({ item, quantity, onIncrement, onDecrement }: VibeyDishTileProps) {
  return (
    <div className="group flex h-full w-[150px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_10px_26px_-18px_rgba(24,24,27,0.55)] ring-1 ring-black/[0.06]">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100">
        <DishImage src={item.image_url} name={item.name} />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2.5">
        <p className="line-clamp-2 min-h-[34px] text-[13px] font-semibold leading-[17px] text-zinc-900">{item.name}</p>
        <div className="mt-auto flex items-center justify-between gap-1">
          <span className="text-[13px] font-medium tabular-nums text-zinc-600">{rupees(Number(item.price) || 0)}</span>
          {quantity > 0 ? (
            <div className="flex items-center rounded-full bg-zinc-950 text-white">
              <motion.button type="button" {...press} onClick={() => onDecrement(item)} aria-label={`One less ${item.name}`}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-full hover:bg-white/10"><Minus className="h-3.5 w-3.5" /></motion.button>
              <span aria-live="polite" className="min-w-4 text-center text-[12px] font-semibold tabular-nums">{quantity}</span>
              <motion.button type="button" {...press} onClick={() => onIncrement(item)} aria-label={`One more ${item.name}`}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-full hover:bg-white/10"><Plus className="h-3.5 w-3.5" /></motion.button>
            </div>
          ) : (
            <motion.button type="button" {...press} onClick={() => onIncrement(item)} aria-label={`Add ${item.name}`}
              className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-zinc-950 text-white shadow-[0_6px_14px_-6px_rgba(24,24,27,0.6)] hover:bg-zinc-800">
              <Plus className="h-4 w-4" />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { DishImage } from '@/components/guest/menu/DishImage';
import { press } from '@/components/guest/menu/motion';
import { rupees } from '@/lib/guest/cashback';
import type { MenuItem } from '@/components/guest/menu/types';

interface VibeyDishCardProps {
  item: MenuItem;
  quantity: number;
  onIncrement: (item: MenuItem) => void;
  onDecrement: (item: MenuItem) => void;
}

/** A dish Vibey points at, drawn from the guest's own menu: photo, name, price, and the same − / + as the menu. */
export function VibeyDishCard({ item, quantity, onIncrement, onDecrement }: VibeyDishCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-2 shadow-[0_10px_26px_-18px_rgba(24,24,27,0.55)] ring-1 ring-black/[0.06]">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
        <DishImage src={item.image_url} name={item.name} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-zinc-900">{item.name}</p>
        <p className="text-[12.5px] text-zinc-500">{rupees(Number(item.price) || 0)}</p>
      </div>
      {quantity > 0 ? (
        <div className="flex items-center gap-1 rounded-full bg-zinc-950 p-1 text-white">
          <motion.button type="button" {...press} onClick={() => onDecrement(item)} aria-label={`One less ${item.name}`}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full hover:bg-white/10"><Minus className="h-4 w-4" /></motion.button>
          <span aria-live="polite" className="min-w-5 text-center text-[13px] font-semibold">{quantity}</span>
          <motion.button type="button" {...press} onClick={() => onIncrement(item)} aria-label={`One more ${item.name}`}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full hover:bg-white/10"><Plus className="h-4 w-4" /></motion.button>
        </div>
      ) : (
        <motion.button type="button" {...press} onClick={() => onIncrement(item)} aria-label={`Add ${item.name}`}
          className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1 rounded-full bg-zinc-950 px-3.5 text-[13px] font-semibold text-white shadow-[0_6px_14px_-6px_rgba(24,24,27,0.6)] hover:bg-zinc-800">
          <Plus className="h-4 w-4" /> Add
        </motion.button>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { flyToCart } from '@/lib/guest/fly-to-cart';
import { AnimatedCount } from './AnimatedCount';
import { press } from './motion';

interface DishAddControlProps {
  name: string;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

/**
 * The control on a dish photo: a round "+" that becomes a − / count / + stepper. Every tap springs, the count pops, and an add
 * sends a small dot to the tray bar. The cart is local, so the number changes on the same frame as the tap.
 */
export function DishAddControl({ name, quantity, onIncrement, onDecrement }: DishAddControlProps) {
  const add = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    flyToCart(e.currentTarget);
    onIncrement();
  };

  if (quantity === 0) {
    return (
      <motion.button type="button" onClick={add} aria-label={`Add ${name}`} {...press}
        className="grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-black text-white shadow-sm hover:bg-zinc-800">
        <Plus size={18} strokeWidth={2.5} />
      </motion.button>
    );
  }
  return (
    <motion.div layout initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-0.5 rounded-full bg-black p-1 text-white shadow-[0_8px_18px_-10px_rgba(0,0,0,0.7)]">
      <motion.button type="button" onClick={(e) => { e.stopPropagation(); onDecrement(); }} {...press}
        aria-label={quantity === 1 ? `Remove ${name}` : `One fewer ${name}`}
        className={`grid h-8 w-8 cursor-pointer place-items-center rounded-full hover:bg-white/15 ${quantity === 1 ? 'text-rose-300' : ''}`}>
        {quantity === 1 ? <Trash2 size={14} strokeWidth={2.5} /> : <Minus size={14} strokeWidth={2.5} />}
      </motion.button>
      <AnimatedCount value={quantity} className="min-w-[22px] text-xs font-semibold" />
      <motion.button type="button" onClick={add} {...press} aria-label={`One more ${name}`}
        className="grid h-8 w-8 cursor-pointer place-items-center rounded-full hover:bg-white/15">
        <Plus size={14} strokeWidth={2.5} />
      </motion.button>
    </motion.div>
  );
}

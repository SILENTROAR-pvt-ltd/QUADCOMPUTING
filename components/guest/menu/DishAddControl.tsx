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
        className="grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] text-[#f5f1e8] shadow-[0_10px_20px_-10px_rgba(15,42,30,0.8)] ring-1 ring-[#d9c193]/35 hover:to-[#24573e]">
        <Plus size={18} strokeWidth={2.5} />
      </motion.button>
    );
  }
  return (
    <motion.div layout initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-0.5 rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] p-1 text-[#f5f1e8] shadow-[0_10px_20px_-10px_rgba(15,42,30,0.8)] ring-1 ring-[#d9c193]/35">
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

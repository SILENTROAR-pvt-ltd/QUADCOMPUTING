'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import { rupees } from '@/lib/guest/cashback';
import { press, SPRING } from '../motion';
import type { CartItem } from '@/lib/store/cart.store';

interface TrayPopoverProps {
  items: CartItem[];
  count: number;
  subtotal: number;
  onClose: () => void;
  onReview: () => void;
}

/** The list that opens above the tray bar: every dish in the tray with its price, and a way to review the order. */
export function TrayPopover({ items, count, subtotal, onClose, onReview }: TrayPopoverProps) {
  return (
    <motion.div
      id="tray-items"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      transition={SPRING}
      className="pointer-events-auto mb-2 flex max-h-72 w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-4 text-white shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-200">In your tray</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] tabular-nums text-neutral-300">{count} {count === 1 ? 'item' : 'items'}</span>
        </div>
        <motion.button type="button" onClick={onClose} aria-label="Close the tray list" {...press}
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-neutral-400 hover:bg-white/10 hover:text-white">
          <X className="h-4 w-4" />
        </motion.button>
      </div>

      <div className="my-2 max-h-40 flex-1 divide-y divide-white/5 overflow-y-auto overscroll-contain pr-1">
        {items.map((item) => (
          <div key={item.cart_id} className="flex items-center justify-between gap-3 py-2 text-xs">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 text-[11px] font-bold tabular-nums text-neutral-400">{item.quantity}×</span>
                <span className="truncate font-medium text-neutral-100">{item.name}</span>
              </div>
              {item.selected_addons && item.selected_addons.length > 0 && (
                <p className="mt-0.5 truncate pl-4 text-[10px] font-light text-neutral-400">+ {item.selected_addons.map((a) => a.name).join(', ')}</p>
              )}
            </div>
            <span className="shrink-0 font-semibold tabular-nums text-white">{rupees(item.total_item_price * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-white/10 pt-2.5">
        <div>
          <span className="block text-[10px] font-light text-neutral-400">Subtotal</span>
          <span className="text-sm font-bold tabular-nums text-white">{rupees(subtotal)}</span>
        </div>
        <motion.button type="button" onClick={onReview} {...press}
          className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-white px-4 text-[11px] font-semibold text-zinc-950 hover:bg-neutral-200">
          Review order <ArrowRight className="h-3.5 w-3.5" />
        </motion.button>
      </div>
    </motion.div>
  );
}

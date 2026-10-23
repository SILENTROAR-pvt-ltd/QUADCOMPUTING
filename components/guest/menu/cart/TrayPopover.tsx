'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Minus, Plus, X } from 'lucide-react';
import { rupees } from '@/lib/guest/cashback';
import { useCartStore } from '@/lib/store/cart.store';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import { press, SPRING } from '../motion';
import type { CartItem } from '@/lib/store/cart.store';

interface TrayPopoverProps {
  items: CartItem[];
  count: number;
  subtotal: number;
  onClose: () => void;
  onReview: () => void;
}

const STEP = 'grid h-7 w-7 cursor-pointer place-items-center rounded-full text-[#0f2a1e] transition-colors hover:bg-[#f3ecdc]';

/** One less / one more of a dish, right in the tray. One less at a single dish takes it out of the tray. */
function TrayStepper({ item }: { item: CartItem }) {
  const increment = useCartStore((s) => s.incrementQuantity);
  const decrement = useCartStore((s) => s.decrementQuantity);
  return (
    <div className="flex shrink-0 items-center rounded-full bg-[#fffdf8] ring-1 ring-[#e2d4b5]">
      <motion.button type="button" onClick={() => decrement(item.cart_id)} aria-label={item.quantity > 1 ? `One less ${item.name}` : `Remove ${item.name}`} {...press} className={STEP}>
        <Minus className="h-3.5 w-3.5" strokeWidth={2.4} />
      </motion.button>
      <span className="min-w-[1.25rem] text-center text-[12px] font-bold tabular-nums text-[#10231a]" aria-live="polite">{item.quantity}</span>
      <motion.button type="button" onClick={() => increment(item.cart_id)} aria-label={`One more ${item.name}`} {...press} className={STEP}>
        <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
      </motion.button>
    </div>
  );
}

/** The list that opens above the tray bar, on the menu's ivory: every dish with − and +, its price, and Review order. */
export function TrayPopover({ items, count, subtotal, onClose, onReview }: TrayPopoverProps) {
  return (
    <motion.div
      id="tray-items"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      transition={SPRING}
      className="pointer-events-auto mb-2 flex max-h-72 w-full flex-col overflow-hidden rounded-[24px] border border-[#e8dfcc] bg-[#fbf9f4] p-4 text-[#10231a] shadow-[0_24px_50px_-22px_rgba(15,42,30,0.55)]"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-[#e8dfcc] pb-2.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[20px] leading-none text-[#10231a]" style={LUXE_SERIF}>Your tray</span>
          <span className="rounded-full bg-[#f3ecdc] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#8a6d3f] ring-1 ring-[#e2d4b5]">{count} {count === 1 ? 'dish' : 'dishes'}</span>
        </div>
        <motion.button type="button" onClick={onClose} aria-label="Close the tray list" {...press}
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-[#10231a]/45 hover:bg-[#f3ecdc] hover:text-[#10231a]">
          <X className="h-4 w-4" />
        </motion.button>
      </div>

      <div className="my-1.5 max-h-40 flex-1 divide-y divide-[#efe6d4] overflow-y-auto overscroll-contain pr-1">
        {items.map((item) => (
          <div key={item.cart_id} className="flex items-center gap-2.5 py-2.5">
            <div className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-[#10231a]">{item.name}</span>
              {item.selected_addons && item.selected_addons.length > 0 && (
                <p className="mt-0.5 truncate text-[11px] text-[#10231a]/50">+ {item.selected_addons.map((a) => a.name).join(', ')}</p>
              )}
            </div>
            <TrayStepper item={item} />
            <span className="w-14 shrink-0 text-right text-[13px] font-semibold tabular-nums text-[#10231a]">{rupees(item.total_item_price * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-[#e8dfcc] pt-3">
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a6d3f]">Subtotal</span>
          <span className="text-[17px] font-semibold tabular-nums text-[#10231a]">{rupees(subtotal)}</span>
        </div>
        <motion.button type="button" onClick={onReview} {...press}
          className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-br from-[#0f2a1e] via-[#143524] to-[#1d4632] px-5 text-[12px] font-semibold text-[#f5f1e8] shadow-[0_12px_24px_-12px_rgba(15,42,30,0.85)] ring-1 ring-[#d9c193]/35">
          Review order <ArrowRight className="h-3.5 w-3.5 text-[#d9c193]" />
        </motion.button>
      </div>
    </motion.div>
  );
}

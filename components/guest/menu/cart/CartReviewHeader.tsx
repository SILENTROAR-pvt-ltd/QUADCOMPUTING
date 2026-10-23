'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { press } from '../motion';
import { tableLabel } from '@/lib/guest/room-mode';

interface CartReviewHeaderProps {
  tableNumber: string;
  itemCount: number;
  hasActiveOrder: boolean;
  onClose: () => void;
}

/** "Review Order", the table and count, a close button, and (when a bill is already running) a note that items join it. */
export function CartReviewHeader({ tableNumber, itemCount, hasActiveOrder, onClose }: CartReviewHeaderProps) {
  return (
    <>
      <div className="flex shrink-0 items-start justify-between gap-3 pb-3.5">
        <div>
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.28em] text-[#8a6d3f]">{tableLabel(tableNumber)} · {itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
          <h3 id="cart-review-title" className="mt-1 text-[30px] font-light leading-none text-[#10231a]" style={{ fontFamily: "var(--font-luxe), 'Playfair Display', Georgia, serif" }}>Review <em className="font-normal text-[#8a6d3f]">order</em></h3>
        </div>
        <motion.button type="button" onClick={onClose} aria-label="Close review" {...press}
          className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-[#10231a]/45 hover:bg-[#f3ecdc] hover:text-[#10231a]">
          <X className="h-5 w-5" />
        </motion.button>
      </div>
      {hasActiveOrder && (
        <div className="mb-3 flex shrink-0 items-start gap-2.5 rounded-2xl border border-[#d9c193] bg-[#fbf6e8] p-2.5 text-xs text-[#10231a]">
          <span className="mt-1 flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#b08d57]" />
          <div className="leading-snug">
            <span className="font-semibold text-[#10231a]">Active order running for {tableLabel(tableNumber)}.</span>{' '}
            <span className="font-normal text-[#10231a]/60">New items will be appended to the current bill.</span>
          </div>
        </div>
      )}
    </>
  );
}

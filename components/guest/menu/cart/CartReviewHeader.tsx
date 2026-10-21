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
          <h3 id="cart-review-title" className="font-editorial text-2xl font-normal text-zinc-950">Review Order</h3>
          <p className="mt-0.5 text-xs text-zinc-400">{tableLabel(tableNumber)} · {itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
        </div>
        <motion.button type="button" onClick={onClose} aria-label="Close review" {...press}
          className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-950">
          <X className="h-5 w-5" />
        </motion.button>
      </div>
      {hasActiveOrder && (
        <div className="mb-3 flex shrink-0 items-start gap-2.5 rounded-xl border border-zinc-200/80 bg-zinc-50/90 p-2.5 text-xs text-zinc-800">
          <span className="mt-1 flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-600" />
          <div className="leading-snug">
            <span className="font-semibold text-zinc-950">Active order running for {tableLabel(tableNumber)}.</span>{' '}
            <span className="font-normal text-zinc-500">New items will be appended to the current bill.</span>
          </div>
        </div>
      )}
    </>
  );
}

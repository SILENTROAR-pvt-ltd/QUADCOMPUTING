'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { rupees } from '@/lib/guest/cashback';
import { press } from '../motion';

interface CartReviewFooterProps {
  total: number;
  sending: boolean;
  disabled: boolean;
  hasActiveOrder: boolean;
  onPlace: () => void;
}

/** The grand total and the Place order button, always in reach below the scrolling review. */
export function CartReviewFooter({ total, sending, disabled, hasActiveOrder, onPlace }: CartReviewFooterProps) {
  return (
    <div className="shrink-0 space-y-3 border-t border-zinc-100 pt-3">
      <div className="flex items-center justify-between text-base font-bold text-zinc-950">
        <span>Grand total</span>
        <span className="tabular-nums">{rupees(total)}</span>
      </div>
      <motion.button type="button" onClick={onPlace} disabled={sending || disabled} {...press}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-zinc-950 py-3.5 text-xs font-semibold uppercase tracking-[0.15em] text-white shadow-[0_12px_24px_-12px_rgba(0,0,0,0.7)] hover:bg-zinc-800 disabled:opacity-60">
        {sending ? (
          <>
            <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            <span>{hasActiveOrder ? 'Adding to your bill…' : 'Sending to kitchen…'}</span>
          </>
        ) : (
          <>
            <span>{hasActiveOrder ? 'Add to existing bill' : 'Place order to kitchen'}</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </motion.button>
    </div>
  );
}

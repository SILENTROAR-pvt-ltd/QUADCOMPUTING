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
  /** Room mode: the words say the order goes to the room, not to a table. */
  roomMode?: boolean;
  onPlace: () => void;
}

/** The grand total and the Place order button, always in reach below the scrolling review. */
export function CartReviewFooter({ total, sending, disabled, hasActiveOrder, roomMode = false, onPlace }: CartReviewFooterProps) {
  return (
    <div className="shrink-0 space-y-3 border-t border-[#e8dfcc] pt-3">
      <div className="flex items-baseline justify-between text-[#10231a]">
        <span className="text-[22px] font-medium" style={{ fontFamily: "var(--font-luxe), 'Playfair Display', Georgia, serif" }}>Grand total</span>
        <span className="text-base font-bold tabular-nums">{rupees(total)}</span>
      </div>
      <motion.button type="button" onClick={onPlace} disabled={sending || disabled} {...press}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#0f2a1e] via-[#143524] to-[#1d4632] py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#f5f1e8] shadow-[0_14px_28px_-14px_rgba(15,42,30,0.85)] ring-1 ring-[#d9c193]/35 disabled:opacity-60">
        {sending ? (
          <>
            <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#d9c193]/40 border-t-[#d9c193]" />
            <span>{roomMode ? 'Sending to the kitchen…' : hasActiveOrder ? 'Adding to your bill…' : 'Sending to kitchen…'}</span>
          </>
        ) : (
          <>
            <span>{roomMode ? 'Send to my room' : hasActiveOrder ? 'Add to existing bill' : 'Place order to kitchen'}</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </motion.button>
    </div>
  );
}

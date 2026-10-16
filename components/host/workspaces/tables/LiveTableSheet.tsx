'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SPRING } from '@/components/guest/menu/motion';

interface LiveTableSheetProps {
  /** Whether a table is chosen: a phone then shows the sheet over the board. */
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Where the selected table's panel lives: a sheet that springs up over the board on a phone (a tap outside closes it), and a
 * sticky column beside the tiles on a desk.
 */
export function LiveTableSheet({ open, onClose, children }: LiveTableSheetProps) {
  return (
    <div
      className={`${open ? 'fixed inset-0 z-[80] flex items-end bg-black/45' : 'hidden'} lg:sticky lg:top-6 lg:z-auto lg:block lg:bg-transparent`}
      onClick={onClose}
    >
      <motion.div
        key={open ? 'open' : 'closed'}
        initial={open ? { y: 48, opacity: 0.7 } : false}
        animate={{ y: 0, opacity: 1 }}
        transition={SPRING}
        className="h-[92dvh] w-full lg:h-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </div>
  );
}

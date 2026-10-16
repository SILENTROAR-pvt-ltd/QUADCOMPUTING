'use client';

import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { SPRING } from './motion';

/** A number that pops when it changes: the old value shrinks away and the new one springs in. */
export function AnimatedCount({ value, className = '' }: { value: number | string; className?: string }) {
  const calm = useReducedMotion();
  return (
    <span className={`relative inline-grid place-items-center tabular-nums ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={calm ? false : { scale: 0.5, opacity: 0, y: 6 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={calm ? undefined : { scale: 0.5, opacity: 0, y: -6 }}
          transition={SPRING}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

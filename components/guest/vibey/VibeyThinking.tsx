'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { VibeyAvatar } from './VibeyAvatar';

/** What Vibey says while it works: short and warm, one line at a time, never a list of its inner steps. */
const LINES = ['One moment…', 'Checking the menu…', 'Finding the good stuff…', 'Almost there…'];

/**
 * The wait, next to the grooving mascot: a single polite line that changes every second or so (shimmering in gold), or
 * "Replying in your language…" while a reply is being translated.
 */
export function VibeyThinking({ steps }: { steps: string[] }) {
  const calm = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => Math.min(n + 1, LINES.length - 1)), 1100);
    return () => window.clearInterval(id);
  }, []);
  const line = steps.includes('translate') ? 'Replying in your language…' : LINES[i];
  return (
    <div className="flex w-full items-center gap-2.5">
      <VibeyAvatar size={30} mood="thinking" />
      <div role="status" aria-live="polite" aria-label="Vibey is working on it"
        className="mr-auto rounded-[20px] rounded-tl-md bg-[#fffdf8] px-4 py-2.5 shadow-[0_14px_30px_-24px_rgba(16,35,26,0.55)] ring-1 ring-[#e8dfcc]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={line} className="shimmer-text block text-[13.5px] font-medium"
            initial={calm ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={calm ? undefined : { opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            {line}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

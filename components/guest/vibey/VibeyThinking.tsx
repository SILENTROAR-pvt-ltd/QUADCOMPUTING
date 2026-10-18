'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { VibeyAvatar } from './VibeyAvatar';

/** Vibey's real steps, in the words a guest sees while it works. "understand" only appears when the model is asked. */
export const STEP_LABELS: Record<string, string> = {
  read: 'Reading your message',
  retrieve: 'Looking through the menu',
  fastpath: 'Matching dishes',
  understand: 'Understanding your request',
  respond: 'Preparing your reply',
};

/** The live progress, Perplexity-style, next to the grooving mascot: finished steps ticked, the current one shimmering. */
export function VibeyThinking({ steps }: { steps: string[] }) {
  const calm = useReducedMotion();
  const shown = steps.length ? steps : ['read'];
  return (
    <div className="flex w-full gap-2">
      <span className="mt-0.5"><VibeyAvatar size={28} mood="thinking" /></span>
      <div role="status" aria-label="Vibey is working on it"
        className="mr-auto min-w-0 rounded-[20px] rounded-tl-md bg-white/95 px-3.5 py-3 shadow-[0_10px_24px_-18px_rgba(24,24,27,0.5)] ring-1 ring-black/[0.05]">
        <ul className="space-y-1.5">
          {shown.map((s, i) => {
            const current = i === shown.length - 1;
            return (
              <motion.li key={s} initial={calm ? false : { opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.16 }}
                className="flex items-center gap-2 text-[13px]">
                {current ? (
                  <span aria-hidden className="relative grid h-4 w-4 place-items-center">
                    <span className="absolute h-4 w-4 animate-ping rounded-full bg-orange-300/70 motion-reduce:hidden" />
                    <span className="h-2 w-2 rounded-full bg-gradient-to-br from-rose-500 to-amber-400" />
                  </span>
                ) : (
                  <Check aria-hidden className="h-4 w-4 text-emerald-600" />
                )}
                <span className={current ? 'shimmer-text font-medium' : 'text-zinc-500'}>{STEP_LABELS[s] ?? s}{current ? '…' : ''}</span>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

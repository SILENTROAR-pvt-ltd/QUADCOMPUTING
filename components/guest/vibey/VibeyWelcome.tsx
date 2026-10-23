'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import { greetingFor } from '@/lib/guest/greeting';
import { VibeyAvatar } from './VibeyAvatar';

/**
 * The first things to ask, floating around the mascot. "Dinner for two" is safe here because Vibey asks the table's
 * tastes first (veg or non-veg, then the craving) before it suggests a spread.
 */
const OPTIONS = [
  { text: 'Dinner for two?', ask: 'Dinner for 2', place: 'left-0 top-[14px]', delay: '0s' },
  { text: 'Chef’s top picks?', ask: "What's popular?", place: 'right-0 top-[40px]', delay: '1.2s' },
  { text: 'Something sweet?', ask: 'Something sweet', place: 'left-[4%] bottom-[44px]', delay: '2.1s' },
  { text: 'Something spicy?', ask: 'Something spicy', place: 'right-[2%] bottom-[6px]', delay: '0.6s' },
];

interface VibeyWelcomeProps {
  venueName: string;
  onPick: (text: string) => void;
}

/** The empty chat: the mascot in the middle with tap-to-ask bubbles drifting round it, then a short greeting. */
export function VibeyWelcome({ venueName, onPick }: VibeyWelcomeProps) {
  const calm = useReducedMotion();
  return (
    <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-1 text-center">
      {/* Centred by auto margins, so a short screen scrolls the whole welcome instead of cutting its top off; the
          bubbles' stage is never squeezed onto the mascot. */}
      <div className="my-auto flex flex-col items-center py-4">
        <div className="relative h-[270px] w-full max-w-[360px] shrink-0">
          <span aria-hidden className="absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(230,207,156,0.42)_0%,rgba(230,207,156,0.12)_45%,transparent_70%)]" />
          <span aria-hidden className="absolute left-1/2 top-1/2 h-[148px] w-[148px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d9c193]/60" />
          <span aria-hidden className="vibey-halo absolute left-1/2 top-1/2 -ml-[62px] -mt-[62px] h-[124px] w-[124px] rounded-full border border-[#d9c193]/45" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><VibeyAvatar size={104} mood="idle" /></span>
          {OPTIONS.map((o, i) => (
            <motion.div key={o.text} className={`absolute ${o.place}`}
              initial={calm ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, delay: 0.15 + i * 0.08 }}>
              <button type="button" onClick={() => onPick(o.ask)} style={{ animationDelay: o.delay }}
                className="vibey-float flex cursor-pointer items-center gap-2 rounded-full border border-[#10231a]/[0.08] bg-white px-3.5 py-2 text-[13px] font-medium text-[#10231a] shadow-[0_12px_26px_-16px_rgba(16,35,26,0.45)] transition-colors hover:border-[#b08d57]/60">
                <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-[#b08d57] to-[#e6cf9c]" />
                {o.text}
              </button>
            </motion.div>
          ))}
        </div>
        <h3 style={LUXE_SERIF} className="mt-4 text-[32px] font-semibold leading-none text-[#10231a]">{greetingFor(new Date().getHours())}</h3>
        <p className="mt-2.5 max-w-[300px] text-[13.5px] leading-relaxed text-[#6f6a5c]">
          I’m Vibey, your host at {venueName}. Ask me anything, in any language.
        </p>
      </div>
    </div>
  );
}

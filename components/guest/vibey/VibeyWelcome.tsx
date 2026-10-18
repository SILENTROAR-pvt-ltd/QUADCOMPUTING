'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { VibeyAvatar } from './VibeyAvatar';

/** Vibey's opening lines, floating around the mascot. Each one is a tap-to-ask suggestion. */
const BUBBLES = [
  { text: 'Kuch thanda chalega?', ask: 'Kuch thanda peena hai', place: 'left-0 top-0', delay: '0s' },
  { text: 'Chef’s top picks?', ask: "What's popular?", place: 'right-0 top-[8px]', delay: '1.1s' },
  { text: 'Something sweet?', ask: 'Something sweet', place: 'left-[6%] bottom-0', delay: '2.2s' },
];

interface VibeyWelcomeProps {
  venueName: string;
  onPick: (text: string) => void;
}

/** The empty chat: a two-tone greeting, the grooving mascot and its speech bubbles (the guest taps one to start). */
export function VibeyWelcome({ venueName, onPick }: VibeyWelcomeProps) {
  const calm = useReducedMotion();
  return (
    <motion.div initial={calm ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-1 flex-col items-center justify-center px-1 py-3 text-center">
      <h3 className="text-[25px] font-semibold leading-[1.15] tracking-tight text-zinc-950 sm:text-[32px]">
        <span className="bg-gradient-to-r from-zinc-400 via-zinc-500 to-rose-400 bg-clip-text text-transparent">Hi, I’m Vibey.</span>
        <br />What’s your vibe today?
      </h3>
      <p className="mt-2 max-w-[300px] text-[13px] leading-relaxed text-zinc-500">
        Order in English or Hinglish. I’ll set up your tray at {venueName}, and you place the order.
      </p>

      <div className="relative mt-4 h-[196px] w-full max-w-[360px]">
        <span aria-hidden className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-amber-200/60 via-rose-200/50 to-violet-200/60 blur-2xl" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><VibeyAvatar size={88} mood="idle" /></span>
        {BUBBLES.map((b) => (
          <button key={b.text} type="button" onClick={() => onPick(b.ask)} style={{ animationDelay: b.delay }}
            className={`vibey-float absolute ${b.place} flex max-w-[48%] cursor-pointer items-center gap-1.5 rounded-2xl bg-white px-3 py-1.5 text-left text-[12px] font-medium text-zinc-800 shadow-[0_10px_24px_-14px_rgba(24,24,27,0.5)] ring-1 ring-black/[0.06] transition-shadow hover:shadow-[0_12px_28px_-12px_rgba(244,63,94,0.45)]`}>
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br from-rose-400 to-amber-300" />
            <span className="leading-snug">{b.text}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

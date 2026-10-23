'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { JOURNEY_STICKERS } from './journey-media';

interface MenuJourneyStepsProps {
  /** Dishes in the tray, not yet sent. */
  cartCount: number;
  /** Dishes already sent to the kitchen. */
  sentCount: number;
  /** Room mode: the last step is following the order to the door; there is nothing to pay now. */
  roomMode?: boolean;
}

const STEPS = [
  { title: 'Pick dishes', hint: 'Tap + on what you like' },
  { title: 'Send to kitchen', hint: 'Review your tray, then send' },
  { title: 'Track & pay', hint: 'Follow your order, pay at the end' },
];
const ROOM_STEPS = [STEPS[0], STEPS[1], { title: 'At your door', hint: 'Follow your order; it goes on your room bill' }];

/**
 * Where the guest is in their visit, so the next thing to do is always obvious. Each step has its own little chef: the
 * current one bobs gently, finished ones carry a tick, and the ones still to come are softened.
 */
export function MenuJourneySteps({ cartCount, sentCount, roomMode = false }: MenuJourneyStepsProps) {
  const steps = roomMode ? ROOM_STEPS : STEPS;
  const current = sentCount > 0 && cartCount === 0 ? 2 : cartCount > 0 ? 1 : 0;
  const calm = useReducedMotion();

  return (
    <ol aria-label="How ordering works" className="grid w-full max-w-xl grid-cols-3 gap-2">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={step.title}
            aria-current={active ? 'step' : undefined}
            className={`relative flex flex-col items-center gap-1 rounded-[20px] border px-2 pb-2.5 pt-2 text-center transition-all duration-500 ${
              active
                ? 'border-[#b08d57]/60 bg-[#fbf9f4] shadow-[0_0_0_3px_rgba(217,193,147,0.18),0_14px_30px_-18px_rgba(15,42,30,0.55)]'
                : done
                  ? 'border-[#e8dfcc] bg-[#f3ecdc]'
                  : 'border-[#e8dfcc] bg-[#fbf9f4]/70'
            }`}
          >
            <span className="relative block h-12 w-12 sm:h-14 sm:w-14">
              <motion.span
                className="block h-full w-full"
                animate={active && !calm ? { y: [0, -3, 0] } : { y: 0 }}
                transition={active && !calm ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a 8-10 KB sticker from public/media; images.unoptimized is set, so next/image would not shrink it either */}
                <img
                  src={JOURNEY_STICKERS[i]}
                  alt=""
                  width={192}
                  height={192}
                  decoding="async"
                  draggable={false}
                  className={`h-full w-full select-none object-contain transition-all duration-500 ${active || done ? '' : 'opacity-60 saturate-[0.6]'}`}
                />
              </motion.span>
              {done && (
                <span aria-hidden className="absolute -bottom-0.5 -right-2 grid h-[18px] w-[18px] place-items-center rounded-full bg-[#0f2a1e] text-[#d9c193] ring-2 ring-[#fbf9f4]">
                  <Check size={11} strokeWidth={3} />
                </span>
              )}
            </span>
            <span className={`text-[11px] sm:text-xs font-semibold ${active ? 'text-[#10231a]' : done ? 'text-[#173a2a]' : 'text-[#10231a]/50'}`}>
              {step.title}
            </span>
            <span className="hidden sm:block text-[10px] leading-tight text-[#10231a]/55">{step.hint}</span>
            {active && <span aria-hidden className="absolute -top-1 right-2 h-2 w-2 rounded-full bg-[#b08d57] shadow-[0_0_10px_2px_rgba(217,193,147,0.8)] animate-pulse" />}
          </li>
        );
      })}
    </ol>
  );
}

export default MenuJourneySteps;

'use client';

import React from 'react';
import { Check, UtensilsCrossed, ChefHat, ReceiptText } from 'lucide-react';

interface MenuJourneyStepsProps {
  /** Dishes in the tray, not yet sent. */
  cartCount: number;
  /** Dishes already sent to the kitchen. */
  sentCount: number;
}

const STEPS = [
  { title: 'Pick dishes', hint: 'Tap + on what you like', icon: UtensilsCrossed },
  { title: 'Send to kitchen', hint: 'Review your tray, then send', icon: ChefHat },
  { title: 'Track & pay', hint: 'Follow your order, pay at the end', icon: ReceiptText },
];

/** Where the guest is in their visit, so the next thing to do is always obvious. */
export function MenuJourneySteps({ cartCount, sentCount }: MenuJourneyStepsProps) {
  const current = sentCount > 0 && cartCount === 0 ? 2 : cartCount > 0 ? 1 : 0;

  return (
    <ol aria-label="How ordering works" className="grid w-full max-w-xl grid-cols-3 gap-2">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const Icon = done ? Check : step.icon;
        return (
          <li
            key={step.title}
            aria-current={active ? 'step' : undefined}
            className={`relative flex flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 text-center transition-all ${
              active
                ? 'border-emerald-700/30 bg-white shadow-[0_10px_30px_-14px_rgba(16,185,129,0.65)]'
                : done
                  ? 'border-emerald-100 bg-emerald-50/60'
                  : 'border-zinc-200/70 bg-white/60'
            }`}
          >
            <span className={`grid h-7 w-7 place-items-center rounded-full ${
              active ? 'bg-[#0A3222] text-white' : done ? 'bg-emerald-500 text-white' : 'bg-zinc-100 text-zinc-400'
            }`}>
              <Icon size={14} strokeWidth={2.4} />
            </span>
            <span className={`text-[11px] sm:text-xs font-semibold ${active ? 'text-zinc-950' : done ? 'text-emerald-800' : 'text-zinc-500'}`}>
              {step.title}
            </span>
            <span className="hidden sm:block text-[10px] leading-tight text-zinc-500">{step.hint}</span>
            {active && <span aria-hidden className="absolute -top-1 right-2 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.8)] animate-pulse" />}
          </li>
        );
      })}
    </ol>
  );
}

export default MenuJourneySteps;

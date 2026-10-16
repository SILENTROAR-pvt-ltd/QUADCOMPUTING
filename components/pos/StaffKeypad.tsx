'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Delete } from 'lucide-react';
import { press } from '@/components/guest/menu/motion';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;
export const PIN_LENGTH = 4;

interface StaffKeypadProps {
  pin: string;
  onChange: (pin: string) => void;
  disabled?: boolean;
  /** Draws the dots red for a moment, after a wrong PIN. */
  wrong?: boolean;
}

/** Four dots and an on-screen numeric keypad (0-9, backspace, clear). Large targets, so a thumb can do it in a hurry. */
export function StaffKeypad({ pin, onChange, disabled = false, wrong = false }: StaffKeypadProps) {
  const add = (d: string) => { if (!disabled && pin.length < PIN_LENGTH) onChange(pin + d); };
  const key = 'grid h-16 cursor-pointer place-items-center rounded-2xl border border-neutral-200 bg-white text-2xl font-semibold text-neutral-950 shadow-sm disabled:opacity-40';
  return (
    <div className="mx-auto w-full max-w-[280px]">
      <div className={`flex justify-center gap-4 py-5 ${wrong ? 'animate-pulse' : ''}`} role="status" aria-label={`${pin.length} of ${PIN_LENGTH} digits entered`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} className={`h-4 w-4 rounded-full border-2 transition-colors ${i < pin.length ? (wrong ? 'border-rose-600 bg-rose-600' : 'border-neutral-950 bg-neutral-950') : 'border-neutral-300'}`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((d) => (
          <motion.button key={d} type="button" onClick={() => add(d)} disabled={disabled} {...press} className={key}>{d}</motion.button>
        ))}
        <motion.button type="button" onClick={() => onChange('')} disabled={disabled || pin.length === 0} {...press}
          className={`${key} text-sm font-semibold text-neutral-600`}>Clear</motion.button>
        <motion.button type="button" onClick={() => add('0')} disabled={disabled} {...press} className={key}>0</motion.button>
        <motion.button type="button" onClick={() => onChange(pin.slice(0, -1))} disabled={disabled || pin.length === 0} aria-label="Delete the last digit" {...press}
          className={`${key} text-neutral-600`}><Delete className="h-6 w-6" aria-hidden /></motion.button>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, BellRing, Undo2 } from 'lucide-react';
import type { MenuItem } from '@/components/guest/menu/types';
import { VibeyAvatar } from './VibeyAvatar';
import { VibeyDishRail } from './VibeyDishRail';
import type { VibeyMsg } from './useVibeyGuest';

interface VibeyMessageProps {
  msg: VibeyMsg;
  menuById: Map<string, MenuItem>;
  quantityOf: (itemId: string) => number;
  onIncrement: (item: MenuItem) => void;
  onDecrement: (item: MenuItem) => void;
  onUndo: (id: string) => void;
  onCallStaff: (id: string, reason: 'help' | 'dietary' | 'other') => void;
}

/** One turn: the guest's words, or Vibey's reply with what it changed, the dishes it points at, and a staff button. */
export function VibeyMessage({ msg, menuById, quantityOf, onIncrement, onDecrement, onUndo, onCallStaff }: VibeyMessageProps) {
  const calm = useReducedMotion();
  const enter = calm ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.22, ease: 'easeOut' as const } };
  if (msg.role === 'guest') {
    return (
      <motion.p {...enter} className="ml-auto max-w-[82%] rounded-[20px] rounded-br-md bg-gradient-to-br from-zinc-900 to-zinc-700 px-3.5 py-2.5 text-[14px] leading-snug text-white shadow-[0_10px_22px_-14px_rgba(24,24,27,0.8)]">
        {msg.text}
      </motion.p>
    );
  }
  const cards = (msg.reply?.cards ?? []).map((c) => menuById.get(c.itemId)).filter((i): i is MenuItem => Boolean(i));
  return (
    <motion.div {...enter} className="flex w-full gap-2">
      <span className="mt-0.5"><VibeyAvatar size={28} /></span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="mr-auto max-w-full rounded-[20px] rounded-tl-md bg-white/95 px-3.5 py-2.5 text-[14px] leading-relaxed text-zinc-800 shadow-[0_10px_24px_-18px_rgba(24,24,27,0.5)] ring-1 ring-black/[0.05]">
          {msg.text}
        </p>

        {msg.applied && (
          <div className={`rounded-2xl px-3.5 py-2.5 text-[13px] ${msg.undone ? 'bg-zinc-100 text-zinc-400 line-through' : 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200'}`}>
            <p className="mb-1 flex items-center gap-1.5 font-semibold"><Check className="h-3.5 w-3.5" aria-hidden /> {msg.undone ? 'Undone' : 'In your tray'}</p>
            <ul className="space-y-0.5">{msg.applied.lines.map((l) => <li key={l}>{l}</li>)}</ul>
            {!msg.undone && (
              <button type="button" onClick={() => onUndo(msg.id)}
                className="mt-1.5 inline-flex h-9 cursor-pointer items-center gap-1 rounded-full px-2 text-[12.5px] font-semibold text-emerald-800 hover:bg-emerald-100">
                <Undo2 className="h-3.5 w-3.5" aria-hidden /> Undo
              </button>
            )}
          </div>
        )}

        {cards.length > 0 && <VibeyDishRail items={cards} quantityOf={quantityOf} onIncrement={onIncrement} onDecrement={onDecrement} />}

        {msg.staff && (
          <button type="button" disabled={msg.staffSent} onClick={() => onCallStaff(msg.id, msg.staff ?? 'help')}
            className="mr-auto inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 text-[13px] font-semibold text-white shadow-[0_8px_18px_-8px_rgba(24,24,27,0.7)] hover:bg-zinc-800 disabled:cursor-default disabled:bg-zinc-200 disabled:text-zinc-500 disabled:shadow-none">
            <BellRing className="h-4 w-4" aria-hidden /> {msg.staffSent ? 'Staff called' : 'Call staff to my table'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BellRing } from 'lucide-react';
import type { MenuItem } from '@/components/guest/menu/types';
import type { StaffReason } from '@/lib/vibey/guest/schema';
import { VibeyAvatar } from './VibeyAvatar';
import { VibeyApplied } from './VibeyApplied';
import { VibeyChips } from './VibeyChips';
import { VibeyDishRail } from './VibeyDishRail';
import { VibeyReplyText } from './VibeyReplyText';
import { useTypewriter } from './useTypewriter';
import type { VibeyMsg } from './useVibeyGuest';

export interface VibeyReplyProps {
  msg: VibeyMsg;
  /** This is the newest reply and it is still typing itself out. */
  typing: boolean;
  onTyped: () => void;
  /** Show the reply's suggestions (only the latest reply has live ones). */
  showChips: boolean;
  sending: boolean;
  onChip: (chip: string, opts: { chip: true; label?: string }) => void;
  menuById: Map<string, MenuItem>;
  quantityOf: (itemId: string) => number;
  onIncrement: (item: MenuItem) => void;
  onDecrement: (item: MenuItem) => void;
  onUndo: (id: string) => void;
  onCallStaff: (id: string, reason: StaffReason) => void;
}

/**
 * Vibey's turn: the words stream in a few at a time behind a gold caret, then what it changed, the dishes it points at,
 * a staff button and tap-to-answer suggestions rise in beneath. Screen readers get the whole reply at once.
 */
export function VibeyReply({ msg, typing, onTyped, showChips, sending, onChip, menuById, quantityOf, onIncrement, onDecrement, onUndo, onCallStaff }: VibeyReplyProps) {
  const calm = useReducedMotion();
  const t = useTypewriter(msg.text, typing, onTyped);
  const cards = (msg.reply?.cards ?? []).map((c) => menuById.get(c.itemId)).filter((i): i is MenuItem => Boolean(i));
  const rise = calm ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, ease: 'easeOut' as const } };
  return (
    <div className="flex w-full gap-2.5">
      <span className="mt-0.5"><VibeyAvatar size={30} mood={t.typing ? 'idle' : 'still'} /></span>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div dir="auto" className={`mr-auto max-w-full rounded-[20px] rounded-tl-md bg-[#fffdf8] px-4 py-3 text-[14.5px] leading-relaxed text-[#1f3329] shadow-[0_14px_30px_-24px_rgba(16,35,26,0.55)] ring-1 ring-[#e8dfcc] ${msg.text.includes('\n• ') ? 'w-full' : ''}`}>
          <span className="sr-only">{msg.text}</span>
          <div aria-hidden><VibeyReplyText text={t.typing ? t.before + t.latest : msg.text} caret={t.typing} /></div>
        </div>
        {t.done && (
          <motion.div {...rise} className="flex min-w-0 flex-col gap-2.5">
            {msg.applied && <VibeyApplied lines={msg.applied.lines} undone={msg.undone} onUndo={() => onUndo(msg.id)} />}
            {cards.length > 0 && <VibeyDishRail items={cards} quantityOf={quantityOf} onIncrement={onIncrement} onDecrement={onDecrement} />}
            {msg.staff && (
              <button type="button" disabled={msg.staffSent} onClick={() => onCallStaff(msg.id, msg.staff ?? 'help')}
                className="mr-auto inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] px-5 text-[13px] font-semibold text-[#f5f1e8] shadow-[0_10px_22px_-12px_rgba(15,42,30,0.75)] ring-1 ring-[#d9c193]/30 disabled:cursor-default disabled:bg-none disabled:bg-[#efe7d6] disabled:text-[#a59a83] disabled:shadow-none">
                <BellRing className="h-4 w-4 text-[#e6cf9c]" aria-hidden />
                {msg.staffSent ? 'Staff called' : msg.staff === 'bill' ? 'Ask for the bill' : 'Call staff to my table'}
              </button>
            )}
            {showChips && (
              <VibeyChips chips={msg.reply?.chips ?? []} labels={msg.reply?.chip_labels} disabled={sending} onPick={(c, label) => onChip(c, { chip: true, label })} />
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

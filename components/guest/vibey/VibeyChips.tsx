'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, CupSoda, Flame, IceCreamCone, Leaf, MessageCircle, Plus, Sparkles, Star, Users, type LucideIcon } from 'lucide-react';
import { press } from '@/components/guest/menu/motion';

/** The icon that says what a suggestion does, read from its words (they are built by code, never by the model). */
function iconFor(chip: string): LucideIcon {
  if (/^add\b/i.test(chip)) return Plus;
  if (/that.s all|^done/i.test(chip)) return Check;
  if (/popular|top|best|chef/i.test(chip)) return Star;
  if (/spicy|teekha/i.test(chip)) return Flame;
  if (/drink|thanda|coffee|tea|shake/i.test(chip)) return CupSoda;
  if (/dessert|sweet|meetha/i.test(chip)) return IceCreamCone;
  if (/dinner|lunch|meal|for \d/i.test(chip)) return Users;
  if (/\bveg\b|light|healthy/i.test(chip)) return Leaf;
  if (/goes well|pair|with it/i.test(chip)) return Sparkles;
  return MessageCircle;
}

interface VibeyChipsProps {
  chips: string[];
  /** The chips in the guest's language, when Vibey translated its reply. */
  labels?: string[];
  disabled: boolean;
  onPick: (chip: string, label?: string) => void;
}

/**
 * Tap-to-answer suggestions under Vibey's latest reply, arriving one after another. The first "Add…" suggestion is the
 * forest one (it changes the tray); the rest are ivory pills with a gold hairline.
 */
export function VibeyChips({ chips, labels, disabled, onPick }: VibeyChipsProps) {
  const calm = useReducedMotion();
  if (!chips.length) return null;
  const primary = chips.findIndex((c) => /^add\b/i.test(c));
  return (
    <div role="list" aria-label="Suggested replies" className="flex flex-wrap gap-2">
      {chips.map((c, i) => {
        const Icon = iconFor(c);
        const main = i === primary;
        const label = labels?.[i];
        return (
          <motion.button key={c} type="button" role="listitem" disabled={disabled} onClick={() => onPick(c, label)} {...press} dir="auto"
            initial={calm ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: calm ? 0 : i * 0.06 }}
            className={`inline-flex h-9 max-w-full cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium transition-colors disabled:opacity-50 ${main
              ? 'bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] text-[#f5f1e8] shadow-[0_10px_20px_-12px_rgba(15,42,30,0.8)] ring-1 ring-[#d9c193]/35'
              : 'border border-[#d9c193]/70 bg-[#fbf9f4] text-[#10231a] hover:border-[#b08d57] hover:bg-[#f5efe2]'}`}>
            <Icon aria-hidden className={`h-3.5 w-3.5 shrink-0 ${main ? 'text-[#e6cf9c]' : 'text-[#8a6d3f]'}`} strokeWidth={2.2} />
            <span className="truncate">{label || c}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { press } from '../motion';

interface SuccessActionProps {
  icon: React.ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
  /** The dark, leading choice; otherwise a quiet outlined one. */
  primary?: boolean;
}

/** One way to spend the wait, as a full-width row: icon, a title with a line beneath, and an arrow that nudges on hover. */
export function SuccessAction({ icon, title, hint, onClick, primary = false }: SuccessActionProps) {
  return (
    <motion.button type="button" onClick={onClick} {...press}
      className={`group flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left ${
        primary ? 'bg-zinc-950 text-white shadow-[0_12px_26px_-14px_rgba(0,0,0,0.6)] hover:bg-zinc-800' : 'border border-neutral-200 bg-white hover:border-neutral-300'
      }`}>
      <span className="flex items-center gap-3">
        <span className={`grid h-9 w-9 place-items-center rounded-full ${primary ? 'bg-white/10' : 'bg-zinc-100 text-zinc-950'}`}>{icon}</span>
        <span>
          <span className={`block text-[14px] font-medium ${primary ? '' : 'text-zinc-950'}`}>{title}</span>
          <span className={`block text-[11.5px] ${primary ? 'text-white/60' : 'text-zinc-500'}`}>{hint}</span>
        </span>
      </span>
      <ArrowRight className={`h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 ${primary ? 'text-white/60' : 'text-zinc-400'}`} aria-hidden />
    </motion.button>
  );
}

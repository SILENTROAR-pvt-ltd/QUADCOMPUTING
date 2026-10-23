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
      className={`group relative flex w-full cursor-pointer items-center justify-between gap-3 rounded-[20px] px-4 py-3.5 text-left ${
        primary ? 'bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] text-[#f5f1e8] shadow-[0_14px_28px_-14px_rgba(15,42,30,0.8)] ring-1 ring-[#d9c193]/30' : 'border border-[#e8dfcc] bg-[#fbf9f4] hover:border-[#d9c193]'
      }`}>
      <span className="flex items-center gap-3">
        <span className={`grid h-9 w-9 place-items-center rounded-full ${primary ? 'bg-white/10 text-[#d9c193]' : 'bg-[#f3ecdc] text-[#8a6d3f]'}`}>{icon}</span>
        <span>
          <span className={`block text-[14px] font-medium ${primary ? '' : 'text-[#10231a]'}`}>{title}</span>
          <span className={`block text-[11.5px] ${primary ? 'text-[#f5f1e8]/60' : 'text-[#10231a]/55'}`}>{hint}</span>
        </span>
      </span>
      <ArrowRight className={`h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 ${primary ? 'text-[#d9c193]' : 'text-[#b08d57]'}`} aria-hidden />
    </motion.button>
  );
}

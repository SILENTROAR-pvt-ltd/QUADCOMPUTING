'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Clock, Receipt } from 'lucide-react';
import { press } from '../motion';

interface BillActionsProps {
  empty: boolean;
  requesting: boolean;
  requested: boolean;
  onRequestBill: () => void;
  onBackToMenu: () => void;
}

/** "Request final bill" (which becomes a quiet "requested" state) and the way back to the menu. */
export function BillActions({ empty, requesting, requested, onRequestBill, onBackToMenu }: BillActionsProps) {
  return (
    <div className="flex flex-col gap-2.5 border-t border-zinc-100 pt-2">
      <motion.button type="button" onClick={onRequestBill} disabled={requesting || empty || requested} {...press}
        className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-bold uppercase tracking-wider shadow-md ${
          requested ? 'cursor-default bg-neutral-100 text-neutral-500' : 'bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-50'
        }`}>
        {requesting ? (
          <><Clock className="h-3.5 w-3.5 animate-spin" /><span>Alerting our team…</span></>
        ) : requested ? (
          <><Check className="h-4 w-4 stroke-[2.5]" /><span>Final bill requested &bull; Waiter alerted</span></>
        ) : (
          <><Receipt className="h-4 w-4" /><span>Request final bill</span></>
        )}
      </motion.button>
      <button type="button" onClick={onBackToMenu}
        className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-950">
        <ArrowLeft className="h-3.5 w-3.5" /><span>Back to menu</span>
      </button>
    </div>
  );
}

// components/guest/lobby/LobbyCashbackBanner.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, X } from 'lucide-react';

interface Props {
  cafeId: string;
  tableNumber: string;
  cafeName?: string;
  transactions?: any[];
  onOpenWallet: () => void;
}

export function LobbyCashbackBanner({ cafeId, tableNumber, cafeName, transactions = [], onOpenWallet }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [cashbackEarned, setCashbackEarned] = useState(0);

  useEffect(() => {
    const recentTx = transactions.find((t) => t.transaction_type === 'CASHBACK');
    const fromTx = recentTx ? Number(recentTx.amount || 0) : 0;
    setCashbackEarned(fromTx > 0 ? fromTx : 0);
  }, [transactions]);

  if (dismissed || cashbackEarned <= 0) return null;

  return (
    <AnimatePresence>
      <motion.aside
        role="status"
        aria-live="polite"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="w-full rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 px-4 py-3 shadow-sm text-neutral-900"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-950 truncate">
                🎉 You earned <span className="font-extrabold text-emerald-700">₹{cashbackEarned}</span> cashback (7%) on this bill!
              </p>
              <p className="text-[11px] text-emerald-700">
                Credited to your {cafeName ? `${cafeName} ` : ''}hospitality wallet balance.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                onOpenWallet();
                try { window.dispatchEvent(new CustomEvent('guest-wallet:refresh')); } catch {}
              }}
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-xs active:scale-95"
            >
              <span>View Wallet</span>
              <ArrowRight className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-200/60 transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
export default LobbyCashbackBanner;

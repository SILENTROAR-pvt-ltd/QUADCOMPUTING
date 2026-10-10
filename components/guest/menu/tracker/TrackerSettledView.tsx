'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';

interface Props {
  tableNumber: string;
  settledTotal: number;
  cafeName?: string;
  /** Cashback actually credited to the wallet ledger for this bill — not a
   * client-side 7% of the total, which claimed a credit that may never have
   * been written. */
  cashbackCredited?: number;
}

export function TrackerSettledView({ tableNumber, settledTotal, cafeName, cashbackCredited = 0 }: Props) {
  const total = Number(settledTotal || 0);

  useEffect(() => {
    if (total <= 0) return;
    try { window.dispatchEvent(new CustomEvent('guest-wallet:refresh')); } catch {}
  }, [total]);

  if (total <= 0) return null;
  const cashbackAmount = Number(cashbackCredited || 0);

  const steps = [
    ['Order served', 'Complete'],
    ['Bill settled', 'Paid'],
    [`Table ${tableNumber}`, 'Vacant'],
  ];

  return (
    <motion.section
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-xl border border-emerald-200 bg-white text-neutral-900 shadow-sm"
    >
      <div className="flex items-center gap-3 border-b border-emerald-100 bg-emerald-50 px-4 py-4 sm:px-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-flex rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
            Payment complete
          </span>
          <h2 className="mt-1 text-base font-semibold">Bill settled. Thank you for visiting!</h2>
          <p className="mt-0.5 text-xs text-neutral-600">Your table has been released.</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500">Paid</p>
          <p className="font-mono text-base font-semibold text-neutral-900">
            ₹{settledTotal.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {cashbackAmount > 0 && (
        <div className="flex items-center justify-between gap-2 border-b border-emerald-100 bg-emerald-500/10 px-4 py-2.5 sm:px-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-xs font-semibold text-emerald-950">
              🎉 You earned <span className="font-bold text-emerald-700">₹{cashbackAmount}</span> cashback (7%) on this bill!
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-emerald-300 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
            {cafeName ? `${cafeName} Wallet` : 'Credited to Wallet'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-3 divide-x divide-neutral-200 px-2 py-3 sm:px-4">
        {steps.map(([label, status]) => (
          <div key={label} className="flex flex-col items-center gap-1 px-1 text-center">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-[10px] font-semibold text-neutral-800">{label}</span>
            <span className="text-[9px] text-neutral-500">{status}</span>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { TOPUP_LIMITS } from '@/lib/services/wallet/plans';

interface WalletTopUpActionsProps {
  isLoading?: boolean;
  isLocked?: boolean;
  onTopUp: (amount: number) => void;
}

export function WalletTopUpActions({ isLoading, isLocked, onTopUp }: WalletTopUpActionsProps) {
  const [custom, setCustom] = useState('');
  const amt = Number(custom);
  const valid = Number.isFinite(amt) && amt >= TOPUP_LIMITS.min && amt <= TOPUP_LIMITS.max;
  const off = isLoading || isLocked;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onTopUp(Math.round(amt));
    setCustom('');
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {[500, 1000, 2500].map((a) => (
        <button key={a} type="button" disabled={off} onClick={() => onTopUp(a)}
          className="h-9 px-3.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-xs font-semibold tabular-nums text-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed">
          +₹{a.toLocaleString('en-IN')}
        </button>
      ))}
      <form onSubmit={submit} className="flex items-center gap-1.5">
        <input type="number" inputMode="numeric" min={TOPUP_LIMITS.min} max={TOPUP_LIMITS.max} placeholder="Other ₹" aria-label="Other amount"
          disabled={off} value={custom} onChange={(e) => setCustom(e.target.value)}
          className="h-9 w-24 px-3 rounded-xl border border-neutral-200 bg-white text-xs text-neutral-900 placeholder-neutral-400 tabular-nums focus:outline-none focus:border-neutral-900 disabled:opacity-50" />
        <button type="submit" disabled={off || !valid}
          className="h-9 inline-flex items-center gap-1 px-3.5 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
          <Plus className="w-3.5 h-3.5" /> Add credit
        </button>
      </form>
    </div>
  );
}

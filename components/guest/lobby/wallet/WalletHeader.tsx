// components/guest/lobby/wallet/WalletHeader.tsx
'use client';

import React from 'react';
import { X, Wallet } from 'lucide-react';

interface Props {
  cafeName: string;
  onClose: () => void;
}

export function WalletHeader({ cafeName, onClose }: Props) {
  return (
    <div className="relative z-10 flex items-center justify-between gap-4 border-b border-neutral-200 pb-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="shrink-0 rounded-2xl border border-emerald-200 bg-emerald-50 p-2 text-emerald-700">
          <Wallet className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
              {cafeName}
            </span>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h3 className="truncate font-serif text-xl font-normal tracking-tight text-neutral-950 sm:text-2xl">
            Cashback & Rewards
          </h3>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="shrink-0 cursor-pointer rounded-full border border-neutral-200 bg-white p-2.5 text-neutral-700 transition-colors hover:bg-neutral-100 active:scale-95"
        aria-label="Close wallet modal"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
export default WalletHeader;

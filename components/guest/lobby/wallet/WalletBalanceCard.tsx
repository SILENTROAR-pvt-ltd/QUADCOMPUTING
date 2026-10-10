// components/guest/lobby/wallet/WalletBalanceCard.tsx
'use client';

import React from 'react';
import { Sparkles, ShieldCheck, Store } from 'lucide-react';
import { GuestWallet } from '../useGuestWallet';

interface Props {
  wallet: GuestWallet;
  cafeName: string;
  tableNumber: string;
}

export function WalletBalanceCard({ wallet, cafeName, tableNumber }: Props) {
  return (
    <div className="relative z-10 my-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5 text-emerald-700">
            <Store className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate text-[11px] font-semibold uppercase tracking-wider">
              {cafeName} Wallet Balance
            </span>
          </div>
          <span className="font-serif text-4xl font-normal tracking-tight text-neutral-950 sm:text-5xl">
            ₹{Number(wallet.balance || 0).toFixed(2)}
          </span>
        </div>

        <div className="shrink-0 text-right">
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
            <Sparkles className="h-3 w-3 text-amber-600" />
            7% Live Cashback
          </span>
          <p className="mt-1 font-mono text-[10px] text-neutral-500">
            Earned: ₹{Number(wallet.total_cashback_earned || 0).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-3 text-xs text-neutral-600">
        <span className="flex items-center gap-1.5 text-[11px]">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          {wallet.wallet_code ? (
            <>Wallet ID <span className="font-mono text-neutral-950">{wallet.wallet_code}</span></>
          ) : (
            'Auto-credited upon bill settlement'
          )}
        </span>
        <span className="shrink-0 font-mono text-[11px] text-neutral-500">
          Table {tableNumber}
        </span>
      </div>
    </div>
  );
}
export default WalletBalanceCard;

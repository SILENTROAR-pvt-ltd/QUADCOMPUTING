'use client';

import React from 'react';
import { Wallet } from 'lucide-react';
import type { VenueWallet } from '@/types/wallet';
import { WalletTopUpActions } from './WalletTopUpActions';

interface WalletBalanceCardProps {
  wallet: VenueWallet | null;
  feesWaived: boolean;
  onTopUp: (amount: number) => void;
  isLoading?: boolean;
  isLocked?: boolean;
}

/** Credit for pay-as-you-go fees. Below zero it never blocks billing: fees wait as outstanding dues. */
export function WalletBalanceCard({ wallet, feesWaived, onTopUp, isLoading, isLocked }: WalletBalanceCardProps) {
  const balance = Number(wallet?.balance || 0);
  const low = !feesWaived && balance < 100;

  return (
    <section className="rounded-2xl border border-neutral-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-neutral-900 text-white grid place-items-center"><Wallet className="w-5 h-5" /></div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Credit wallet</p>
            {isLoading && !wallet ? (
              <div className="h-9 w-32 bg-neutral-100 animate-pulse rounded-lg mt-1" />
            ) : (
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-neutral-900">
                ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>
        </div>
        {low && !isLoading && (
          <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-medium text-amber-800">Running low</span>
        )}
      </div>
      <p className="text-xs text-neutral-500 leading-relaxed">
        {feesWaived
          ? 'Your plan covers platform fees, so nothing is taken from this credit while it runs.'
          : 'Pay-as-you-go fees are taken from this credit. If it runs out, billing keeps working and fees are kept as dues.'}
      </p>
      <WalletTopUpActions isLoading={isLoading} isLocked={isLocked} onTopUp={onTopUp} />
    </section>
  );
}

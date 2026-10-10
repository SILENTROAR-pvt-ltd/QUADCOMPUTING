'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface WalletHeaderProps {
  loading: boolean;
  onRefresh: () => void;
}

export function WalletHeader({ loading, onRefresh }: WalletHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-neutral-900">Subscription & Credit Wallet</h2>
        <p className="mt-1 text-xs sm:text-sm text-neutral-500">Your plan, your credit for platform fees, and every charge in one place.</p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 self-start sm:self-auto disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </button>
    </div>
  );
}

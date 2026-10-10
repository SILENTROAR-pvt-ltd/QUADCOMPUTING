'use client';

import React, { useState } from 'react';
import { ShieldCheck, Copy, Check } from 'lucide-react';

export interface ActiveRedemption {
  code: string;
  amount: number;
  status: 'pending' | 'verified' | string;
  expires_at: string;
}

function validUntil(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

/** The one-time code the host verifies, its state, and how long it stays valid. */
export function WalletHostPass({ redemption, walletCode }: { redemption: ActiveRedemption; walletCode?: string | null }) {
  const [copied, setCopied] = useState(false);
  const until = validUntil(redemption.expires_at);
  const verified = redemption.status === 'verified';

  const handleCopy = () => {
    navigator.clipboard.writeText(redemption.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 space-y-2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Host Redemption Pass
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
          verified ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}>
          {verified ? 'Verified by Host' : 'Waiting for Host'}
        </span>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 p-2.5">
        <div className="min-w-0">
          <p className="font-mono text-base font-bold tracking-widest text-neutral-950">{redemption.code}</p>
          <p className="text-[10px] text-neutral-500">
            Up to ₹{Number(redemption.amount).toFixed(2)} off this bill{until ? ` · valid until ${until}` : ''}
          </p>
          {walletCode && <p className="font-mono text-[10px] text-neutral-400">Wallet {walletCode}</p>}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code"
          className="shrink-0 rounded-lg border border-neutral-200 bg-white p-2 text-neutral-700 transition-colors hover:bg-neutral-100 cursor-pointer"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <p className="text-center text-[9px] text-neutral-500">
        Single-use. Show this to the host before the bill is settled. Only the discount applied is taken from your wallet.
      </p>
    </div>
  );
}

export default WalletHostPass;

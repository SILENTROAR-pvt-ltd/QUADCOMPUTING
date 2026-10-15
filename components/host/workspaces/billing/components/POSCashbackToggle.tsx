'use client';

import React from 'react';
import { Sparkles, Wallet } from 'lucide-react';

interface POSCashbackToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  cashbackAmount: number;
  guestHandle?: string | null;
}

export function POSCashbackToggle({
  enabled,
  onToggle,
  cashbackAmount,
  guestHandle,
}: POSCashbackToggleProps) {
  // Cashback needs a wallet, and only a guest signed in on Vibers Connect has one. A walk-in bill has nothing to switch on.
  const allowed = Boolean(guestHandle);
  const on = enabled && allowed;
  const displayTarget = guestHandle?.startsWith('@') ? guestHandle : `@${guestHandle}`;

  return (
    <div className="pt-2 pb-1 border-t border-dashed border-neutral-200">
      <div
        className={`flex items-center justify-between gap-2 p-2 rounded-xl border transition-all ${
          allowed ? 'bg-emerald-50/70 border-emerald-500/25' : 'bg-neutral-50 border-neutral-200'
        }`}
      >
        <label
          htmlFor="pos-cashback-switch"
          className={`flex items-center gap-2 select-none min-w-0 ${allowed ? 'cursor-pointer' : 'cursor-not-allowed'}`}
        >
          <div className={`p-1 rounded-lg flex-shrink-0 ${allowed ? 'bg-emerald-500/10 text-emerald-700' : 'bg-neutral-200/70 text-neutral-500'}`}>
            <Wallet className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className={`text-xs font-semibold ${allowed ? 'text-neutral-900' : 'text-neutral-600'}`}>Credit 7% Guest Cashback</span>
              {allowed && <Sparkles className="h-3 w-3 text-amber-500" />}
            </div>
            <p className={`text-[10px] font-medium ${allowed ? 'text-emerald-700 truncate' : 'text-neutral-500'}`}>
              {!allowed
                ? 'Only for guests signed in on Vibers Connect'
                : on && cashbackAmount > 0
                  ? `+₹${cashbackAmount.toFixed(2)} to ${displayTarget} wallet`
                  : 'Credit rewards on settlement'}
            </p>
          </div>
        </label>

        <button
          type="button"
          id="pos-cashback-switch"
          role="switch"
          aria-checked={on}
          disabled={!allowed}
          onClick={() => onToggle(!enabled)}
          className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
            on ? 'bg-emerald-600' : 'bg-neutral-300'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
              on ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export default POSCashbackToggle;

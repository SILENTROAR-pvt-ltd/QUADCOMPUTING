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
  const displayTarget = guestHandle?.startsWith('@')
    ? guestHandle
    : (guestHandle ? `@${guestHandle}` : 'guest');

  return (
    <div className="pt-2 pb-1 border-t border-dashed border-neutral-200">
      <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-emerald-50/70 border border-emerald-500/25 transition-all">
        <label
          htmlFor="pos-cashback-switch"
          className="flex items-center gap-2 cursor-pointer select-none min-w-0"
        >
          <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-700 flex-shrink-0">
            <Wallet className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-neutral-900">Credit 7% Guest Cashback</span>
              <Sparkles className="h-3 w-3 text-amber-500" />
            </div>
            <p className="text-[10px] text-emerald-700 font-medium truncate">
              {enabled && cashbackAmount > 0
                ? `+₹${cashbackAmount.toFixed(2)} to ${displayTarget} wallet`
                : 'Credit rewards on settlement'}
            </p>
          </div>
        </label>

        <button
          type="button"
          id="pos-cashback-switch"
          role="switch"
          aria-checked={enabled}
          onClick={() => onToggle(!enabled)}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            enabled ? 'bg-emerald-600' : 'bg-neutral-300'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
              enabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export default POSCashbackToggle;

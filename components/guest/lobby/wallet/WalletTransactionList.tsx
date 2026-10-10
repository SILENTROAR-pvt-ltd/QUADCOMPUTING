// components/guest/lobby/wallet/WalletTransactionList.tsx
'use client';

import React from 'react';
import { Clock, Sparkles, ArrowDownLeft } from 'lucide-react';
import { WalletTransaction } from '../useGuestWallet';

interface Props {
  transactions: WalletTransaction[];
  defaultCafeName: string;
}

export function WalletTransactionList({ transactions, defaultCafeName }: Props) {
  return (
    <div className="relative z-10 max-h-[360px] flex-1 space-y-3 overflow-y-auto pr-1 no-scrollbar">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-neutral-500">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-neutral-400" />
          Immutable Transaction Ledger
        </span>
        <span>{transactions.length} records</span>
      </div>

      {transactions.length === 0 ? (
        <div className="space-y-2 rounded-2xl border border-neutral-200 bg-white px-4 py-8 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-amber-600 opacity-70" />
          <p className="text-xs font-medium text-neutral-800">
            No settled cashback records for this venue yet
          </p>
          <p className="mx-auto max-w-xs text-[11px] text-neutral-500">
            Place an order to automatically receive 7% cashback into this venue wallet upon settlement.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => {
            const venue = tx.cafe_name || defaultCafeName;
            const tablePart = tx.table_number ? ` • Table ${tx.table_number}` : '';
            const title = tx.description || `7% cashback on ${venue}${tablePart}`;
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 transition-colors hover:border-neutral-300"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700">
                    <ArrowDownLeft className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-neutral-950">{title}</p>
                    <p className="mt-0.5 truncate font-mono text-[10px] text-neutral-500">
                      {new Date(tx.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                      {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                      &bull; Rate {tx.rate || '7%'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="font-mono text-xs font-bold text-emerald-700">
                    +₹{Number(tx.amount || 0).toFixed(2)}
                  </span>
                  <p className="font-mono text-[10px] text-neutral-500">
                    Bal: ₹{Number(tx.balance_after || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default WalletTransactionList;

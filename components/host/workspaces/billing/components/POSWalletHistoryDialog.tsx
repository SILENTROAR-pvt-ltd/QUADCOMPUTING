'use client';

import React from 'react';
import { ArrowDownLeft, ArrowUpRight, X } from 'lucide-react';
import type { HostWalletView } from '@/lib/services/wallet/host-wallet-view.service';

type WalletTransaction = HostWalletView['transactions'][number];

export const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const TYPE_LABEL: Record<string, string> = {
  CASHBACK: 'Cashback earned',
  REDEMPTION: 'Used on bill',
  ADJUSTMENT: 'Adjustment',
};

function dateOf(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

interface POSWalletHistoryDialogProps {
  guestHandle: string;
  transactions: WalletTransaction[];
  onClose: () => void;
}

/** The guest's wallet ledger, opened on demand so the billing screen stays short. */
export function POSWalletHistoryDialog({ guestHandle, transactions, onClose }: POSWalletHistoryDialogProps) {
  return (
    <div role="dialog" aria-modal="true" aria-label={`Wallet history for ${guestHandle}`} onClick={onClose} className="fixed inset-0 z-[110] flex items-center justify-center bg-neutral-950/40 p-4 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[80vh] w-full max-w-md flex-col rounded-3xl border border-neutral-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Wallet history</p>
            <p className="text-sm font-semibold text-neutral-900">{guestHandle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close history" className="rounded-full border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </header>
        <ul className="divide-y divide-neutral-100 overflow-y-auto px-5">
          {transactions.length === 0 && <li className="py-6 text-center text-xs text-neutral-500">No wallet activity yet.</li>}
          {transactions.map((t) => {
            const credit = t.transaction_type === 'CASHBACK' || (t.transaction_type === 'ADJUSTMENT' && t.amount > 0);
            return (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3 text-xs">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${credit ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>
                    {credit ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-900">
                      {TYPE_LABEL[t.transaction_type] ?? t.transaction_type}{t.table_number ? ` · ${t.table_number}` : ''}
                    </p>
                    <p className="text-[10px] text-neutral-500">{dateOf(t.created_at)}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`font-semibold ${credit ? 'text-emerald-700' : 'text-neutral-900'}`}>
                    {credit ? '+' : '−'}{inr(Math.abs(t.amount))}
                  </p>
                  <p className="text-[10px] text-neutral-500">Balance {inr(t.balance_after)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default POSWalletHistoryDialog;

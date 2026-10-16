'use client';

import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Loader2 } from 'lucide-react';
import type { HistoryRow } from '@/lib/services/wallet/wallet-history.service';
import { inr, timeLabel, TYPE_LABEL } from './history-format';

interface HistoryRowItemProps {
  row: HistoryRow;
  venueName: string;
  /** Whether the guest can open the bill (they are signed in). */
  canOpenBill: boolean;
  loadingBill: boolean;
  onOpenBill: (orderId: string) => void;
}

/** One ledger entry: what happened, where and when, the amount with the balance after, and a link to the bill. */
export function HistoryRowItem({ row: t, venueName, canOpenBill, loadingBill, onOpenBill }: HistoryRowItemProps) {
  const credit = t.transaction_type === 'CASHBACK' || (t.transaction_type === 'ADJUSTMENT' && t.amount > 0);
  return (
    <li className="flex items-start gap-3 px-5 py-3.5 sm:px-6">
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${credit ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-600'}`}>
        {credit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900">
          {TYPE_LABEL[t.transaction_type] ?? t.transaction_type}{t.table_number ? ` · Table ${t.table_number}` : ''}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-neutral-500">
          <span className="inline-block rounded-md bg-neutral-100 px-1.5 py-0.5 font-medium text-neutral-700">{venueName}</span>
          {' '}{timeLabel(t.created_at)}{t.description ? ` · ${t.description}` : ''}
        </p>
        {t.order_id && canOpenBill && (
          <button type="button" onClick={() => onOpenBill(t.order_id as string)} disabled={loadingBill}
            className="mt-1 inline-flex min-h-8 cursor-pointer items-center gap-1 text-[11px] font-semibold text-neutral-700 underline-offset-2 hover:underline disabled:opacity-50">
            {loadingBill && <Loader2 className="h-3 w-3 animate-spin" />}
            View invoice #{t.order_id.split('-')[0].toUpperCase()}
          </button>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-sm font-semibold ${credit ? 'text-emerald-700' : 'text-neutral-900'}`}>{credit ? '+' : '−'}{inr(Math.abs(t.amount))}</p>
        <p className="text-[10px] text-neutral-400">Balance {inr(t.balance_after)}</p>
      </div>
    </li>
  );
}

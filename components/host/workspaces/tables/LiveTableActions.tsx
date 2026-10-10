'use client';

import React, { useState } from 'react';
import { CreditCard, Loader2, LogOut } from 'lucide-react';
import { inr } from './LiveTableLine';
import type { Tender } from './useTableActions';

interface LiveTableActionsProps {
  tableNumber: string;
  hasBill: boolean;
  total: number;
  busy: 'settle' | 'release' | null;
  error: string | null;
  onSettle: (tender: Tender) => void;
  onRelease: () => void;
  onOpenBilling: () => void;
}

const TENDERS: Tender[] = ['CASH', 'UPI', 'CARD'];
type Confirm = 'settle' | 'release' | null;

/** Settle the bill and free the table, or free an empty/unstarted table. Both ask first. */
export function LiveTableActions({ tableNumber, hasBill, total, busy, error, onSettle, onRelease, onOpenBilling }: LiveTableActionsProps) {
  const [tender, setTender] = useState<Tender>('CASH');
  const [confirm, setConfirm] = useState<Confirm>(null);
  const working = busy !== null;

  const doConfirm = () => {
    if (confirm === 'settle') onSettle(tender);
    if (confirm === 'release') onRelease();
    setConfirm(null);
  };

  return (
    <div className="space-y-3">
      {hasBill && (
        <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-3 gap-1 rounded-xl bg-neutral-100 p-1">
          {TENDERS.map((t) => (
            <button key={t} type="button" role="radio" aria-checked={tender === t} onClick={() => setTender(t)}
              className={`h-8 rounded-lg text-[11px] font-semibold cursor-pointer ${tender === t ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'}`}>
              {t === 'UPI' ? 'UPI' : t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {confirm ? (
        <div role="alertdialog" aria-label="Confirm" className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs font-medium text-neutral-900">
            {confirm === 'settle'
              ? `Settle ${inr(total)} by ${tender.toLowerCase()} and free table ${tableNumber}?`
              : `Free table ${tableNumber}? Unstarted items on it will be removed.`}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirm(null)} className="h-9 cursor-pointer rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-100">Cancel</button>
            <button type="button" onClick={doConfirm} disabled={working} className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-neutral-950 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50">
              {working && <Loader2 className="h-3 w-3 animate-spin" />} Confirm
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          {hasBill && (
            <button type="button" onClick={() => setConfirm('settle')} disabled={working}
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-neutral-950 text-xs font-semibold uppercase tracking-wider text-white hover:bg-neutral-800 disabled:opacity-40">
              <CreditCard className="h-3.5 w-3.5" /> Settle & free table
            </button>
          )}
          <button type="button" onClick={() => setConfirm('release')} disabled={working}
            className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white text-xs font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-40">
            <LogOut className="h-3.5 w-3.5" /> Mark vacant
          </button>
          {hasBill && (
            <button type="button" onClick={onOpenBilling} className="cursor-pointer text-center text-[11px] font-medium text-neutral-500 hover:text-neutral-900">
              Discount, wallet or split in billing
            </button>
          )}
        </div>
      )}

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>}
    </div>
  );
}

export default LiveTableActions;

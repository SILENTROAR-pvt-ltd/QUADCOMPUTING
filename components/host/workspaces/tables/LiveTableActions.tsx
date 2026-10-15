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
  locked?: boolean;
  error: string | null;
  onSettle: (tender: Tender) => void;
  onRelease: () => void;
  onOpenBilling: () => void;
}

const TENDERS: Tender[] = ['CASH', 'UPI', 'CARD'];
type Confirm = 'settle' | 'release' | null;

/** Settle the bill and free the table, or free an empty/unstarted table. Both ask first. */
export function LiveTableActions({ tableNumber, hasBill, total, busy, locked = false, error, onSettle, onRelease, onOpenBilling }: LiveTableActionsProps) {
  const [tender, setTender] = useState<Tender>('CASH');
  const [confirm, setConfirm] = useState<Confirm>(null);
  const working = busy !== null;

  const doConfirm = () => {
    if (confirm === 'settle') onSettle(tender);
    if (confirm === 'release') onRelease();
    setConfirm(null);
  };

  return (
    <div className="space-y-2.5">
      {hasBill && !confirm && (
        <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-3 gap-1 rounded-2xl bg-neutral-100 p-1">
          {TENDERS.map((t) => (
            <button key={t} type="button" role="radio" aria-checked={tender === t} onClick={() => setTender(t)}
              className={`h-10 rounded-xl text-[13px] font-semibold cursor-pointer ${tender === t ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500 active:bg-white/60'}`}>
              {t === 'UPI' ? 'UPI' : t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {confirm ? (
        <div role="alertdialog" aria-label="Confirm" className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3.5">
          <p className="text-[13px] font-medium leading-snug text-neutral-900">
            {confirm === 'settle'
              ? `Settle ${inr(total)} by ${tender.toLowerCase()} and free table ${tableNumber}?`
              : `Free table ${tableNumber}? Unstarted items on it will be removed.`}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirm(null)} className="h-12 cursor-pointer rounded-2xl border border-neutral-200 bg-white text-[13px] font-semibold text-neutral-700 active:bg-neutral-100">Cancel</button>
            <button type="button" onClick={doConfirm} disabled={working} className="inline-flex h-12 cursor-pointer items-center justify-center gap-1.5 rounded-2xl bg-neutral-950 text-[13px] font-semibold text-white active:bg-neutral-800 disabled:opacity-50">
              {working && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Confirm
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          {hasBill && (
            <button type="button" onClick={() => setConfirm('settle')} disabled={working || locked}
              className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-neutral-950 text-[14px] font-semibold text-white shadow-[0_14px_24px_-14px_rgba(0,0,0,0.6)] active:scale-[0.99] disabled:bg-neutral-300 disabled:shadow-none">
              {locked
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating the bill…</>
                : busy === 'settle'
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Settling…</>
                  : <><CreditCard className="h-4 w-4" /> Settle &amp; free table</>}
            </button>
          )}
          <button type="button" onClick={() => setConfirm('release')} disabled={working}
            className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white text-[13px] font-semibold text-neutral-800 active:bg-neutral-50 disabled:opacity-40">
            <LogOut className="h-4 w-4" /> Mark vacant
          </button>
          {hasBill && (
            <button type="button" onClick={onOpenBilling} className="min-h-10 cursor-pointer text-center text-[12px] font-medium text-neutral-500 hover:text-neutral-900">
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

'use client';

import React, { useState } from 'react';
import { CheckCircle2, Loader2, LogOut, Send } from 'lucide-react';
import { inr } from './LiveTableLine';
import type { TableActionKind } from './useTableActions';

interface LiveTableActionsProps {
  tableNumber: string;
  hasBill: boolean;
  total: number;
  busy: TableActionKind | null;
  /** The bill is still being brought up to date, so sending it waits. */
  locked?: boolean;
  /** Billing has already been asked to settle this table. */
  billRequested: boolean;
  error: string | null;
  onSendToBilling: () => void;
  onRelease: () => void;
  onOpenBilling: () => void;
}

type Confirm = 'request' | 'release' | null;

/**
 * What a waiter can do with a table: send its bill to billing (the cashier settles it there), or free a table that has
 * nothing started. Both ask first. A waiter never settles or frees a table that has a bill.
 */
export function LiveTableActions({ tableNumber, hasBill, total, busy, locked = false, billRequested, error, onSendToBilling, onRelease, onOpenBilling }: LiveTableActionsProps) {
  const [confirm, setConfirm] = useState<Confirm>(null);
  const working = busy !== null;

  const doConfirm = () => {
    if (confirm === 'request') onSendToBilling();
    if (confirm === 'release') onRelease();
    setConfirm(null);
  };

  return (
    <div className="space-y-2">
      {confirm ? (
        <div role="alertdialog" aria-label="Confirm" className="space-y-2.5 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-[13px] font-medium leading-snug text-neutral-900">
            {confirm === 'request'
              ? `Send table ${tableNumber}'s bill (${inr(total)}) to billing? The cashier will settle it.`
              : `Free table ${tableNumber}? Unstarted items on it will be removed.`}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirm(null)} className="h-11 cursor-pointer rounded-xl border border-neutral-200 bg-white text-[13px] font-semibold text-neutral-700 active:bg-neutral-100">Cancel</button>
            <button type="button" onClick={doConfirm} disabled={working} className="inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-neutral-950 text-[13px] font-semibold text-white active:bg-neutral-800 disabled:opacity-50">
              {working && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {confirm === 'request' ? 'Send' : 'Confirm'}
            </button>
          </div>
        </div>
      ) : hasBill ? (
        billRequested ? (
          <p role="status" className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-[13px] font-medium leading-snug text-sky-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>Sent to billing. The cashier will settle table {tableNumber}.</span>
          </p>
        ) : (
          <button type="button" onClick={() => setConfirm('request')} disabled={working || locked}
            className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-neutral-950 px-3 text-[14px] font-semibold text-white shadow-[0_10px_20px_-14px_rgba(0,0,0,0.6)] active:scale-[0.99] disabled:bg-neutral-300 disabled:shadow-none">
            {locked
              ? <><Loader2 className="h-4 w-4 shrink-0 animate-spin" /> <span className="truncate">Updating the bill…</span></>
              : busy === 'request'
                ? <><Loader2 className="h-4 w-4 shrink-0 animate-spin" /> <span className="truncate">Sending…</span></>
                : <><Send className="h-4 w-4 shrink-0" /> <span className="truncate">Send to billing</span></>}
          </button>
        )
      ) : (
        <button type="button" onClick={() => setConfirm('release')} disabled={working} aria-label={`Mark table ${tableNumber} vacant`}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white text-[13px] font-semibold text-neutral-800 active:bg-neutral-50 disabled:opacity-40">
          <LogOut className="h-4 w-4 shrink-0" /> Mark vacant
        </button>
      )}

      {hasBill && !confirm && (
        <button type="button" onClick={onOpenBilling} className="block min-h-9 w-full cursor-pointer text-center text-[12px] font-medium text-neutral-500 hover:text-neutral-900">
          Open billing
        </button>
      )}

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>}
    </div>
  );
}

export default LiveTableActions;

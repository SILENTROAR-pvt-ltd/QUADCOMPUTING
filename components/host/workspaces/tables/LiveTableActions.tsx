'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { press } from '@/components/guest/menu/motion';
import { CheckCircle2, Loader2, LogOut, Send } from 'lucide-react';
import { inr } from './LiveTableLine';
import { TENDERS } from './tender-options';
import type { Tender, TableActionKind } from './useTableActions';

interface LiveTableActionsProps {
  tableNumber: string;
  hasBill: boolean;
  total: number;
  busy: TableActionKind | null;
  /** The bill is still being brought up to date, so settling waits. */
  locked?: boolean;
  /** Billing has already been asked to settle this table. */
  billRequested: boolean;
  error: string | null;
  /** The owner lets waiters settle. Off: the only way to close a bill from here is to send it to billing. */
  canSettle: boolean;
  onSettle: (tender: Tender) => void;
  onSendToBilling: () => void;
  onRelease: () => void;
  onOpenBilling: () => void;
}

type Confirm = 'release' | null;

/**
 * What a waiter can do with a table: settle its bill and free it (when the owner allows it), send the bill to billing for
 * the cashier, or free a table that has nothing started.
 */
export function LiveTableActions({ tableNumber, hasBill, total, busy, locked = false, billRequested, error, canSettle, onSettle, onSendToBilling, onRelease, onOpenBilling }: LiveTableActionsProps) {
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [tender, setTender] = useState<Tender | null>(null);
  const working = busy !== null;

  return (
    <div className="space-y-2">
      {confirm === 'release' ? (
        <div role="alertdialog" aria-label="Confirm" className="space-y-2.5 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-[13px] font-medium leading-snug text-neutral-900">Free table {tableNumber}? Unstarted items on it will be removed.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirm(null)} className="h-11 cursor-pointer rounded-xl border border-neutral-200 bg-white text-[13px] font-semibold text-neutral-700 active:bg-neutral-100">Cancel</button>
            <button type="button" onClick={() => { onRelease(); setConfirm(null); }} disabled={working} className="inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-neutral-950 text-[13px] font-semibold text-white active:bg-neutral-800 disabled:opacity-50">
              {working && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Confirm
            </button>
          </div>
        </div>
      ) : hasBill ? (
        tender ? (
          <div role="alertdialog" aria-label="Confirm settlement" className="space-y-2.5 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-[13px] font-medium leading-snug text-neutral-900">
              Settle table {tableNumber} ({inr(total)}) as paid by {TENDERS.find((t) => t.id === tender)?.label.toLowerCase()}? The table will be freed.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setTender(null)} disabled={working} className="h-11 cursor-pointer rounded-xl border border-neutral-200 bg-white text-[13px] font-semibold text-neutral-700 active:bg-neutral-100 disabled:opacity-50">Back</button>
              <button type="button" onClick={() => { onSettle(tender); setTender(null); }} disabled={working || locked}
                className="inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-emerald-700 text-[13px] font-semibold text-white active:bg-emerald-800 disabled:opacity-50">
                {working && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Settle
              </button>
            </div>
          </div>
        ) : (
          <>
            {billRequested && (
              <p role="status" className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[12.5px] font-medium leading-snug text-sky-900">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>Billing has been asked for table {tableNumber}.</span>
              </p>
            )}
            {canSettle && (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  {locked ? 'Updating the bill…' : 'Settle & free table · paid by'}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {TENDERS.map(({ id, label, Icon }) => (
                    <motion.button key={id} type="button" onClick={() => setTender(id)} disabled={working || locked} {...press}
                      className="flex h-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl bg-neutral-950 text-[12px] font-semibold text-white disabled:bg-neutral-300">
                      <Icon className="h-4 w-4" aria-hidden /> {label}
                    </motion.button>
                  ))}
                </div>
              </>
            )}
            {!billRequested && (
              <motion.button type="button" onClick={onSendToBilling} disabled={working || locked} {...press}
                className={canSettle
                  ? 'flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white text-[12.5px] font-semibold text-neutral-700 disabled:opacity-50'
                  : 'flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-neutral-950 text-[14px] font-semibold text-white disabled:bg-neutral-300'}>
                {busy === 'request' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {canSettle ? 'Send to billing instead' : locked ? 'Updating the bill…' : 'Send to billing'}
              </motion.button>
            )}
          </>
        )
      ) : (
        <button type="button" onClick={() => setConfirm('release')} disabled={working} aria-label={`Mark table ${tableNumber} vacant`}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white text-[13px] font-semibold text-neutral-800 active:bg-neutral-50 disabled:opacity-40">
          <LogOut className="h-4 w-4 shrink-0" /> Mark vacant
        </button>
      )}

      {hasBill && !confirm && !tender && (
        <button type="button" onClick={onOpenBilling} className="block min-h-9 w-full cursor-pointer text-center text-[12px] font-medium text-neutral-500 hover:text-neutral-900">
          Open billing
        </button>
      )}

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>}
    </div>
  );
}

export default LiveTableActions;

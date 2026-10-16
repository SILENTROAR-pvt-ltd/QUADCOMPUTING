'use client';

import React from 'react';
import { Receipt } from 'lucide-react';
import { ActiveOrderItem } from './types';
import { normalizeBillItems } from './bill/normalize-bill-items';
import { BillSettledCard } from './bill/BillSettledCard';
import { BillLines } from './bill/BillLines';
import { BillTotals } from './bill/BillTotals';
import { BillActions } from './bill/BillActions';

interface ActiveBillViewProps {
  tableNumber: string;
  runningTotal: number;
  sentItems: ActiveOrderItem[];
  onRequestBill: () => void;
  isRequestingBill: boolean;
  onBackToMenu: () => void;
  billRequested?: boolean;
  billSettled?: boolean;
  settledTotal?: number;
  /** Cashback actually written to the guest's wallet ledger for this bill. Never derive it from the total. */
  cashbackCredited?: number;
  /** The wallet redeem option, shown while the bill is open. */
  redeemSlot?: React.ReactNode;
  /** GST on the open order, as the venue charges it. Zero when the venue has no verified GSTIN. */
  taxAmount?: number;
}

/** The Bill tab: what was ordered and what is payable, the wallet option, and a way to ask for the final bill. */
export const ActiveBillView: React.FC<ActiveBillViewProps> = ({
  tableNumber, runningTotal, sentItems, onRequestBill, isRequestingBill, onBackToMenu,
  billRequested = false, billSettled = false, settledTotal = 0, cashbackCredited = 0, redeemSlot, taxAmount = 0,
}) => {
  if (billSettled && Number(settledTotal || 0) > 0) {
    return <BillSettledCard tableNumber={tableNumber} total={settledTotal} cashback={Number(cashbackCredited || 0)} onBackToMenu={onBackToMenu} />;
  }

  const lines = normalizeBillItems(sentItems);
  const computed = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const subtotal = Number(runningTotal) > 0 ? Number(runningTotal) : computed;
  const gst = Math.max(0, Number(taxAmount) || 0);
  const payable = Math.round(subtotal + gst);

  return (
    <div className="mx-auto max-w-xl space-y-6 pt-2">
      <div className="space-y-6 rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-xl sm:p-8">
        {billRequested && (
          <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 text-neutral-900">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-neutral-500" />
              <div>
                <p className="text-xs font-bold leading-tight">Final Bill Requested</p>
                <p className="mt-0.5 text-[11px] text-neutral-600">Our team has been told. Your bill is being prepared.</p>
              </div>
            </div>
            <span className="shrink-0 rounded border border-neutral-200 bg-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-600">Notified</span>
          </div>
        )}

        <div className="flex items-center justify-between border-b border-zinc-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700"><Receipt className="h-5 w-5" /></div>
            <div>
              <h2 className="font-editorial text-lg font-normal tracking-tight text-zinc-950 sm:text-xl">Your bill</h2>
              <p className="mt-0.5 font-mono text-xs text-zinc-400">Table {tableNumber} &bull; {lines.length} {lines.length === 1 ? 'item' : 'items'}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-xl font-bold text-zinc-950 sm:text-2xl">₹{payable.toFixed(0)}</span>
            <p className="font-mono text-[10px] text-zinc-400">{gst > 0 ? 'Running total incl. GST' : 'Running total'}</p>
          </div>
        </div>

        <BillLines lines={lines} />
        {lines.length > 0 && <BillTotals subtotal={subtotal} gst={gst} payable={payable} />}
        {lines.length > 0 && !billSettled && redeemSlot}
        <BillActions empty={lines.length === 0} requesting={isRequestingBill} requested={billRequested} onRequestBill={onRequestBill} onBackToMenu={onBackToMenu} />
      </div>
    </div>
  );
};

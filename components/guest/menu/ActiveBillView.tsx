'use client';

import React from 'react';
import { ActiveOrderItem } from './types';
import { Receipt, Check, ArrowLeft, Clock } from 'lucide-react';

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
  /** Cashback actually written to the guest's wallet ledger for this bill.
   * Never derive this from the bill total — that claimed a credit had happened
   * when nothing had been written. */
  cashbackCredited?: number;
  /** The wallet redeem option, shown while the bill is open. */
  redeemSlot?: React.ReactNode;
  /** GST on the open order, as the venue charges it. Zero when the venue has no verified GSTIN. */
  taxAmount?: number;
}

export const ActiveBillView: React.FC<ActiveBillViewProps> = ({
  tableNumber,
  runningTotal,
  sentItems,
  onRequestBill,
  isRequestingBill,
  onBackToMenu,
  billRequested = false,
  billSettled = false,
  settledTotal = 0,
  cashbackCredited = 0,
  redeemSlot,
  taxAmount = 0,
}) => {
  if (billSettled && Number(settledTotal || 0) > 0) {
    const cashbackEarned = Number(cashbackCredited || 0);
    return (
      <div role="status" aria-live="polite" className="mx-auto max-w-xl overflow-hidden rounded-xl border border-emerald-200 bg-white text-center shadow-sm">
        <div className="bg-emerald-50 px-6 py-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm"><Check className="h-6 w-6" /></div>
          <p className="mt-3 text-[9px] font-bold uppercase tracking-wider text-emerald-700">Payment complete</p>
          <h2 className="mt-1 text-base font-semibold text-neutral-900">Bill settled. Thank you for visiting!</h2>
          <p className="mt-1 text-sm text-neutral-600">Table {tableNumber} is now vacant.</p>
          <p className="mt-3 font-mono text-lg font-semibold text-neutral-900">₹{settledTotal.toLocaleString('en-IN')}</p>
          {cashbackEarned > 0 && (
            <div className="mt-3 mx-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white px-3.5 py-1 text-xs font-semibold text-emerald-800 shadow-xs">
              <span>🎉 You earned <strong className="font-bold text-emerald-700">₹{cashbackEarned}</strong> cashback (7%) on this bill!</span>
            </div>
          )}
        </div>
        <button type="button" onClick={onBackToMenu} className="m-4 rounded-lg border border-neutral-200 bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-200">Back to Menu</button>
      </div>
    );
  }

  // Robust normalization of items to eliminate any possibility of NaN
  const normalizedItems = (sentItems || []).map((it: any, idx: number) => {
    const itemName = it.item_name || it.name || it.title || 'Curated Dish';
    const quantity = Math.max(1, Number(it.quantity ?? it.qty ?? 1) || 1);
    const unitPrice = Number(it.price ?? it.unit_price ?? it.total_item_price ?? 0) || 0;
    const lineTotal = unitPrice * quantity;
    const notes = it.notes || null;
    const kotStatus = it.kot_status || 'dispatched';

    return {
      id: it.id || `bill_item_${idx}`,
      itemName,
      quantity,
      unitPrice,
      lineTotal,
      notes,
      kotStatus,
    };
  });

  // Calculate clean, bulletproof subtotal directly from normalized items
  const computedSubtotal = normalizedItems.reduce((acc, it) => acc + it.lineTotal, 0);
  const displayTotal = Number(runningTotal) > 0 ? Number(runningTotal) : computedSubtotal;
  const gst = Math.max(0, Number(taxAmount) || 0);
  const payable = Math.round(displayTotal + gst);

  return (
    <div className="max-w-xl mx-auto space-y-6 pt-2">
      <div className="border border-zinc-200/90 rounded-3xl p-6 sm:p-8 space-y-6 bg-white shadow-xl">
        {/* Bill Requested Alert Banner */}
        {billRequested && (
          <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3.5 flex items-center justify-between text-neutral-900">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-neutral-500 animate-pulse shrink-0" />
              <div>
                <p className="text-xs font-bold leading-tight">Final Bill Requested</p>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  Host & captain have been alerted. Your printed invoice is being prepared.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white text-neutral-600 border border-neutral-200 shrink-0">
              Notified
            </span>
          </div>
        )}

        {/* Bill Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-editorial text-lg sm:text-xl font-normal text-zinc-950 tracking-tight">
                Your bill
              </h2>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Table {tableNumber} &bull; {normalizedItems.length} {normalizedItems.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl sm:text-2xl font-mono font-bold text-zinc-950">
              ₹{payable.toFixed(0)}
            </span>
            <p className="text-[10px] text-zinc-400 font-mono">{gst > 0 ? 'Running total incl. GST' : 'Running total'}</p>
          </div>
        </div>

        {/* Itemized List */}
        {normalizedItems.length > 0 ? (
          <div className="divide-y divide-zinc-100">
            {normalizedItems.map((it) => (
              <div key={it.id} className="py-3.5 flex items-start justify-between text-xs gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-zinc-900">
                      {it.quantity}× {it.itemName}
                    </span>
                    {it.quantity > 1 && (
                      <span className="text-[10px] font-mono text-zinc-400">
                        (@ ₹{it.unitPrice.toFixed(0)})
                      </span>
                    )}
                  </div>
                  {it.notes && (
                    <p className="text-[11px] text-zinc-400 font-light mt-0.5">
                      Note: {it.notes}
                    </p>
                  )}
                </div>
                <span className="text-zinc-900 font-mono font-bold shrink-0 text-sm">
                  ₹{it.lineTotal.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center space-y-1">
            <p className="text-sm font-medium text-zinc-600">No active items on bill yet</p>
            <p className="text-xs text-zinc-400 font-light">Dishes sent to kitchen will appear here automatically.</p>
          </div>
        )}

        {/* Bill Summary Breakdown */}
        {normalizedItems.length > 0 && (
          <div className="pt-4 border-t border-zinc-100 space-y-2 text-xs">
            <div className="flex justify-between text-zinc-500 font-medium">
              <span>Item Subtotal</span>
              <span className="font-mono text-zinc-900">₹{displayTotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-zinc-500 font-medium">
              <span>GST</span>
              <span className={`font-mono ${gst > 0 ? 'text-zinc-900' : 'text-zinc-500'}`}>{gst > 0 ? `₹${gst.toFixed(2)}` : 'Not charged'}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-zinc-950 pt-2 border-t border-zinc-100">
              <span>Total Payable</span>
              <span className="font-mono text-base">₹{payable.toFixed(0)}</span>
            </div>
            <p className="text-[10px] text-zinc-400">Discounts and wallet credit are applied on your final bill.</p>
          </div>
        )}

        {normalizedItems.length > 0 && !billSettled && redeemSlot}

        {/* Actions */}
        <div className="pt-2 border-t border-zinc-100 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onRequestBill}
            disabled={isRequestingBill || normalizedItems.length === 0 || billRequested}
            className={`w-full rounded-2xl py-3.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-[0.99] flex items-center justify-center gap-2 ${
              billRequested
                ? 'bg-neutral-100 text-neutral-500 cursor-default'
                : 'bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-50'
            }`}
          >
            {isRequestingBill ? (
              <>
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Alerting Service Captain...</span>
              </>
            ) : billRequested ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Final Bill Requested &bull; Waiter Alerted</span>
              </>
            ) : (
              <>
                <Receipt className="w-4 h-4" />
                <span>Request Final Bill</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onBackToMenu}
            className="w-full text-center py-2.5 text-xs font-medium text-zinc-500 hover:text-zinc-950 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};

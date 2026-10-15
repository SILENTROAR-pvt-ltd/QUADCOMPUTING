'use client';

import React from 'react';
import { Receipt, Clock, BellRing, ArrowRight, Check } from 'lucide-react';

export interface TrackerActionsProps {
  totalAmount: number;
  onViewBill?: () => void;
  onRequestBill?: () => void;
  isRequestingBill?: boolean;
  billRequested?: boolean;
  onExploreLounge?: () => void;
}

const quiet = 'inline-flex h-10 items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-[12.5px] font-medium text-zinc-800 transition-all hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.97] cursor-pointer';

export function TrackerActions({
  totalAmount,
  onViewBill,
  onRequestBill,
  isRequestingBill = false,
  billRequested = false,
  onExploreLounge,
}: TrackerActionsProps) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-[#e6d9b8]/60 pt-5">
      {onViewBill && (
        <button type="button" onClick={onViewBill} className={quiet}>
          <Receipt className="h-3.5 w-3.5 text-neutral-500" />
          <span>Your bill so far</span>
          <span className="font-mono text-neutral-500">₹{totalAmount}</span>
        </button>
      )}

      {onRequestBill && (
        <button
          type="button"
          onClick={onRequestBill}
          disabled={isRequestingBill || billRequested}
          className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-[12.5px] font-semibold transition-all active:scale-[0.97] ${
            billRequested
              ? 'cursor-default border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'cursor-pointer bg-[#0A3222] text-white shadow-[0_8px_18px_-10px_rgba(10,50,34,0.8)] hover:bg-[#0d3f2b]'
          } disabled:opacity-100`}
        >
          {isRequestingBill ? (
            <><Clock className="h-3.5 w-3.5 animate-spin" /><span>One moment…</span></>
          ) : billRequested ? (
            <><Check className="h-3.5 w-3.5" strokeWidth={2.4} /><span>Bill requested. Our team has been told</span></>
          ) : (
            <><BellRing className="h-3.5 w-3.5 text-amber-200" /><span>Request the bill</span></>
          )}
        </button>
      )}

      {onExploreLounge && (
        <div className="basis-full">
          <button type="button" onClick={onExploreLounge} className={`${quiet} text-[#0A3222]`}>
            <span>Explore our lounge</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default TrackerActions;

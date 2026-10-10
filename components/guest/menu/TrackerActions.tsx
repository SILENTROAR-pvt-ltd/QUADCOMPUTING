'use client';

import React from 'react';
import { Receipt, Clock, BellRing, ArrowRight } from 'lucide-react';

export interface TrackerActionsProps {
  totalAmount: number;
  onViewBill?: () => void;
  onRequestBill?: () => void;
  isRequestingBill?: boolean;
  billRequested?: boolean;
  onExploreServices?: () => void;
}

export function TrackerActions({
  totalAmount,
  onViewBill,
  onRequestBill,
  isRequestingBill = false,
  billRequested = false,
  onExploreServices,
}: TrackerActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100">
      <div className="flex items-center gap-2 flex-wrap">
        {onViewBill && (
          <button
            type="button"
            onClick={onViewBill}
            className="px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-medium transition-all active:scale-95 cursor-pointer flex items-center gap-2 shadow-2xs"
          >
            <Receipt className="w-3.5 h-3.5 text-neutral-600" />
            <span>View Running Bill</span>
            <span className="font-mono text-neutral-500 font-medium">(₹{totalAmount})</span>
          </button>
        )}

        {onRequestBill && (
          <button
            type="button"
            onClick={onRequestBill}
            disabled={isRequestingBill || billRequested}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
              billRequested
                ? 'bg-neutral-100 text-neutral-500 border border-neutral-200 cursor-default'
                : 'bg-neutral-900 hover:bg-neutral-800 text-white'
            }`}
          >
            {isRequestingBill ? (
              <>
                <Clock className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Requesting...</span>
              </>
            ) : billRequested ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Bill Requested &bull; Waiter Notified</span>
              </>
            ) : (
              <>
                <BellRing className="w-3.5 h-3.5 text-amber-400" />
                <span>Request Final Bill</span>
              </>
            )}
          </button>
        )}
      </div>

      {onExploreServices && (
        <button
          type="button"
          onClick={onExploreServices}
          className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-500/20 transition-all active:scale-95 flex items-center gap-1.5 ml-auto shadow-2xs cursor-pointer"
        >
          <span>Explore Services</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

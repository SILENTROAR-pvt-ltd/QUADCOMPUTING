'use client';

import React from 'react';
import { Receipt, Clock, BellRing, ArrowRight } from 'lucide-react';

interface TrackerActionsProps {
  runningTotal: number;
  onViewBill: () => void;
  onRequestBill?: () => void;
  isRequestingBill?: boolean;
  billRequested?: boolean;
  onExploreServices?: () => void;
}

export const TrackerActions: React.FC<TrackerActionsProps> = ({
  runningTotal,
  onViewBill,
  onRequestBill,
  isRequestingBill = false,
  billRequested = false,
  onExploreServices,
}) => {
  return (
    <div className="pt-2.5 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onViewBill}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-800 text-[11px] font-medium transition-all active:scale-95 cursor-pointer"
        >
          <Receipt className="w-3.5 h-3.5 text-neutral-400" />
          <span>View Running Bill</span>
          <span className="font-mono text-neutral-400">(₹{runningTotal})</span>
        </button>

        {onRequestBill && (
          <button
            type="button"
            onClick={onRequestBill}
            disabled={isRequestingBill || billRequested}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-tight transition-all active:scale-95 cursor-pointer shadow-xs ${
              billRequested
                ? 'bg-neutral-100 text-neutral-500 border border-neutral-200 cursor-default'
                : 'bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-900'
            }`}
          >
            {isRequestingBill ? (
              <>
                <Clock className="w-3 h-3 animate-spin text-black" />
                <span>Requesting...</span>
              </>
            ) : billRequested ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span>Bill Requested &bull; Waiter Notified</span>
              </>
            ) : (
              <>
                <BellRing className="w-3.5 h-3.5 text-black" />
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-800 border border-neutral-200 hover:bg-neutral-200 text-[11px] font-semibold transition-all active:scale-95 cursor-pointer ml-auto"
        >
          <span>Explore Services</span>
          <ArrowRight className="w-3 h-3 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
};

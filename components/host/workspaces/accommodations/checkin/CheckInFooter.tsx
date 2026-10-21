'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  formId: string;
  numNights: number;
  roomPrice: number;
  roomTariffTotal: number;
  checkInAddonsTotal: number;
  estimatedTotal: number;
  isUpdating: boolean;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/**
 * Always in view at the bottom of the panel: what the stay comes to by the same rules checkout bills with, and the one
 * button that registers the guest. Taxes and anything ordered to the room are added at checkout.
 */
export function CheckInFooter({ formId, numNights, roomPrice, roomTariffTotal, checkInAddonsTotal, estimatedTotal, isUpdating }: Props) {
  return (
    <div className="shrink-0 border-t border-neutral-200 bg-white px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:px-6">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-neutral-500">
            {numNights} night{numNights === 1 ? '' : 's'} × {inr(roomPrice)} = {inr(roomTariffTotal)}{checkInAddonsTotal > 0 ? ` · add-ons ${inr(checkInAddonsTotal)}` : ''}
          </p>
          <p className="font-serif text-2xl leading-tight text-neutral-950">{inr(estimatedTotal)}</p>
          <p className="truncate text-[11px] text-neutral-500">Estimated · taxes and room orders are added at checkout</p>
        </div>
        <button type="submit" form={formId} disabled={isUpdating}
          className="inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 text-sm font-semibold text-white shadow-[0_12px_28px_-14px_rgba(4,120,87,0.9)] hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
          {isUpdating ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Checking in…</> : <><CheckCircle2 className="h-4 w-4" aria-hidden /> Check in</>}
        </button>
      </div>
    </div>
  );
}

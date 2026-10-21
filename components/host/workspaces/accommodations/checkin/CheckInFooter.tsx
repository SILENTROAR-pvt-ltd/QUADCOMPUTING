'use client';

import React from 'react';
import { CheckCircle2, HandCoins } from 'lucide-react';
import type { CheckInPayment } from './useRoomCheckInState';

interface Props {
  numNights: number;
  roomPrice: number;
  checkInAddonsTotal: number;
  estimatedTotal: number;
  /** The choice made in the form's Payment section: what the one button will do. */
  payment: CheckInPayment;
  isUpdating: boolean;
  onCheckIn: () => void;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/**
 * Always in view at the bottom of the panel: what the stay comes to by the same rules checkout bills with, and one
 * button that says exactly what happens next, as chosen in the Payment section above it.
 */
export function CheckInFooter({ numNights, roomPrice, checkInAddonsTotal, estimatedTotal, payment, isUpdating, onCheckIn }: Props) {
  const taking = payment.payNow ? (payment.amount === null ? estimatedTotal : payment.amount) : 0;
  return (
    <div className="shrink-0 border-t border-neutral-200 bg-white px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:px-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-xs text-neutral-500">
          {numNights} night{numNights === 1 ? '' : 's'} × {inr(roomPrice)}{checkInAddonsTotal > 0 ? ` + add-ons ${inr(checkInAddonsTotal)}` : ''} · taxes and room orders at checkout
        </p>
        <p className="shrink-0 font-serif text-2xl leading-none text-neutral-950">{inr(estimatedTotal)}</p>
      </div>
      <button type="button" onClick={onCheckIn} disabled={isUpdating}
        className={`mt-2.5 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${payment.payNow ? 'bg-emerald-700 shadow-[0_12px_28px_-14px_rgba(4,120,87,0.9)] hover:bg-emerald-800' : 'bg-neutral-950 hover:bg-neutral-800'}`}>
        {isUpdating
          ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Checking in…</>
          : payment.payNow
            ? <><HandCoins className="h-4 w-4" aria-hidden /> Check in &amp; take {inr(taking)} now</>
            : <><CheckCircle2 className="h-4 w-4" aria-hidden /> Check in · pay at checkout</>}
      </button>
      <p className="mt-1.5 text-center text-[11px] text-neutral-500">{payment.payNow ? 'The payment sheet opens as soon as the guest is in.' : 'Change this in the Payment section above.'}</p>
    </div>
  );
}

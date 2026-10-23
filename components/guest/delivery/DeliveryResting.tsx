'use client';

import React from 'react';
import { Truck } from 'lucide-react';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';

/** When the venue is not delivering: a gracious note, with the tray kept and one way back to ordering at the table. */
export function DeliveryResting({ onBack }: { onBack: () => void }) {
  return (
    <div className="rounded-[24px] border border-[#e8dfcc] bg-[#f8f4ea] px-5 py-6 text-center">
      <span aria-hidden className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#0f2a1e] text-[#d9c193] shadow-[0_10px_22px_-12px_rgba(15,42,30,0.9)]">
        <Truck className="h-5 w-5" />
      </span>
      <p className="mt-4 text-[22px] leading-tight text-[#10231a]" style={LUXE_SERIF}>Delivery is resting for now</p>
      <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-[#10231a]/65">
        We&apos;re not sending dishes out just yet, and we would love to serve you right here. Your tray is saved, so you can
        send it to the kitchen from your table whenever you&apos;re ready.
      </p>
      <button type="button" onClick={onBack}
        className="mt-5 inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[#0f2a1e] via-[#143524] to-[#1d4632] px-6 text-[12px] font-semibold text-[#f5f1e8] shadow-[0_12px_24px_-12px_rgba(15,42,30,0.85)] ring-1 ring-[#d9c193]/35 active:scale-[0.98]">
        Back to my order
      </button>
    </div>
  );
}

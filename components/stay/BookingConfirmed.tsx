'use client';

import React, { useState } from 'react';
import { Check, Copy, ImageDown } from 'lucide-react';
import { inr, plural, shortDate } from './stay-format';
import { stayButton } from './StayShell';
import { copyText } from '@/lib/guest/copy-text';
import { useCardPicture } from '@/lib/guest/useCardPicture';

export interface Confirmed { code: string; room_type: string; check_in: string; check_out: string; nights: number; estimated_total: number; guest_name: string; expected_arrival: string; linked_to_account?: boolean }

/**
 * The reservation is made: the code to show at the desk (copy it in one tap, or keep the card as a picture in the
 * gallery), and the three things that happen next.
 */
export function BookingConfirmed({ done, onClose }: { done: Confirmed; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const pic = useCardPicture(`booking-${done.code.toLowerCase()}.png`, `Booking ${done.code}`);
  const copy = async () => { if (await copyText(done.code)) { setCopied(true); setTimeout(() => setCopied(false), 2000); } };

  return (
    <div className="mt-6 space-y-4">
      <div ref={pic.ref} className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-center">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-emerald-600 text-white"><Check className="h-5 w-5" strokeWidth={3} aria-hidden /></span>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-emerald-700">Your booking code</p>
        <p className="mt-1.5 font-mono text-3xl font-semibold tracking-wider text-neutral-950">{done.code}</p>
        <p className="mt-2 text-xs text-emerald-800">{done.guest_name}, {plural(done.nights, 'night')} in a {done.room_type}.</p>
        <p className="mt-0.5 text-xs text-emerald-800">{shortDate(done.check_in)} → {shortDate(done.check_out)} · {inr(done.estimated_total)} at the desk</p>
        {done.linked_to_account && <p className="mt-1 text-[11px] text-emerald-700">Saved to your Vibers ID.</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => void copy()} className={`${stayButton.ghost} w-full !px-3 !text-[13px]`} aria-live="polite">
          {copied ? <><Check className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden /> Copied</> : <><Copy className="h-4 w-4 shrink-0" aria-hidden /> Copy code</>}
        </button>
        <button type="button" onClick={() => void pic.save()} disabled={pic.busy} className={`${stayButton.ghost} w-full !px-3 !text-[13px]`}>
          <ImageDown className="h-4 w-4 shrink-0" aria-hidden /> {pic.busy ? 'Preparing…' : pic.canShare ? 'Save to gallery' : 'Save picture'}
        </button>
      </div>
      {pic.note && <p role="status" className="text-center text-xs text-neutral-500">{pic.note}</p>}
      <ol className="space-y-2.5 rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
        <li className="flex gap-2.5"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-neutral-950 text-[10px] font-semibold text-white">1</span>Come to the front desk with this code and pay for the room ({inr(done.estimated_total)}) by UPI, cash or card.</li>
        <li className="flex gap-2.5"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-neutral-950 text-[10px] font-semibold text-white">2</span>Check in on your phone (the desk shows you a QR) or let the desk check you in.</li>
        <li className="flex gap-2.5"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-neutral-950 text-[10px] font-semibold text-white">3</span>Bring an ID: on your phone you add a photo of it; at the desk they note its number.</li>
      </ol>
      <button type="button" onClick={onClose} className={`${stayButton.ghost} w-full`}>Done</button>
    </div>
  );
}

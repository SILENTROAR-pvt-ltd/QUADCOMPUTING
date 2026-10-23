'use client';

import React, { useState } from 'react';
import { Check, Copy, ImageDown } from 'lucide-react';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import { inr, plural, shortDate } from './stay-format';
import { stayButton } from './StayShell';
import { copyText } from '@/lib/guest/copy-text';
import { useCardPicture } from '@/lib/guest/useCardPicture';

export interface Confirmed { code: string; room_type: string; check_in: string; check_out: string; nights: number; estimated_total: number; guest_name: string; expected_arrival: string; linked_to_account?: boolean }

const STEP = 'grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] text-[10px] font-semibold text-[#d9c193]';

/**
 * The reservation is made: the code to show at the desk on a champagne card (copy it in one tap, or keep the card as a
 * picture in the gallery), and the three things that happen next.
 */
export function BookingConfirmed({ done, onClose }: { done: Confirmed; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const pic = useCardPicture(`booking-${done.code.toLowerCase()}.png`, `Booking ${done.code}`);
  const copy = async () => { if (await copyText(done.code)) { setCopied(true); setTimeout(() => setCopied(false), 2000); } };

  return (
    <div className="mt-5 space-y-4">
      <div ref={pic.ref} className="rounded-[1.5rem] border border-[#d9c193] bg-[linear-gradient(160deg,#fbf6e8,#f3ead6)] p-5 text-center shadow-[0_20px_40px_-32px_rgba(15,42,30,0.6)]">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] text-[#d9c193] ring-1 ring-[#d9c193]/40"><Check className="h-5 w-5" strokeWidth={3} aria-hidden /></span>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.26em] text-[#8a6d3f]">Your booking code</p>
        <p className="mt-1.5 font-mono text-3xl font-semibold tracking-wider text-[#10231a]">{done.code}</p>
        <p className="mt-2 text-[15px] italic text-[#10231a]/80" style={LUXE_SERIF}>{done.guest_name}, {plural(done.nights, 'night')} in a {done.room_type}.</p>
        <p className="mt-0.5 text-xs text-[#10231a]/60">{shortDate(done.check_in)} → {shortDate(done.check_out)} · {inr(done.estimated_total)} at the desk</p>
        {done.linked_to_account && <p className="mt-1 text-[11px] text-[#173a2a]">Saved to your Vibers ID.</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => void copy()} className={`${stayButton.ghost} w-full !px-3 !text-[13px]`} aria-live="polite">
          {copied ? <><Check className="h-4 w-4 shrink-0 text-[#173a2a]" aria-hidden /> Copied</> : <><Copy className="h-4 w-4 shrink-0" aria-hidden /> Copy code</>}
        </button>
        <button type="button" onClick={() => void pic.save()} disabled={pic.busy} className={`${stayButton.ghost} w-full !px-3 !text-[13px]`}>
          <ImageDown className="h-4 w-4 shrink-0" aria-hidden /> {pic.busy ? 'Preparing…' : pic.canShare ? 'Save to gallery' : 'Save picture'}
        </button>
      </div>
      {pic.note && <p role="status" className="text-center text-xs text-[#10231a]/55">{pic.note}</p>}
      <ol className="space-y-2.5 rounded-2xl border border-[#e8dfcc] bg-[#f8f4ea] p-4 text-[13px] leading-relaxed text-[#10231a]/75">
        <li className="flex gap-2.5"><span className={STEP}>1</span>Come to the front desk with this code and pay for the room ({inr(done.estimated_total)}) by UPI, cash or card.</li>
        <li className="flex gap-2.5"><span className={STEP}>2</span>Check in on your phone (the desk shows you a QR) or let the desk check you in.</li>
        <li className="flex gap-2.5"><span className={STEP}>3</span>Bring an ID: on your phone you add a photo of it; at the desk they note its number.</li>
      </ol>
      <button type="button" onClick={onClose} className={`${stayButton.primary} w-full`}>Wonderful</button>
    </div>
  );
}

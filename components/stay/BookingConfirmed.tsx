'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { inr, plural } from './stay-format';
import { stayButton } from './StayShell';

export interface Confirmed { code: string; room_type: string; check_in: string; check_out: string; nights: number; estimated_total: number; guest_name: string; expected_arrival: string; linked_to_account?: boolean }

/** The reservation is made: the code to show at the desk, and the three things that happen next. */
export function BookingConfirmed({ done, onClose }: { done: Confirmed; onClose: () => void }) {
  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 text-center">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-emerald-600 text-white"><Check className="h-5 w-5" strokeWidth={3} aria-hidden /></span>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-emerald-700">Your booking code</p>
        <p className="mt-1.5 font-mono text-3xl font-semibold tracking-wider text-neutral-950">{done.code}</p>
        <p className="mt-2 text-xs text-emerald-800">{done.guest_name}, {plural(done.nights, 'night')} in a {done.room_type}. Keep this code.</p>
        {done.linked_to_account && <p className="mt-1 text-[11px] text-emerald-700">Saved to your Vibers ID.</p>}
      </div>
      <ol className="space-y-2.5 rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
        <li className="flex gap-2.5"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-neutral-950 text-[10px] font-semibold text-white">1</span>Come to the front desk and pay for the room ({inr(done.estimated_total)}) by UPI, cash or card.</li>
        <li className="flex gap-2.5"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-neutral-950 text-[10px] font-semibold text-white">2</span>The desk confirms, and your check-in link opens on your phone.</li>
        <li className="flex gap-2.5"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-neutral-950 text-[10px] font-semibold text-white">3</span>Add your ID photo, and your room is yours.</li>
      </ol>
      <button type="button" onClick={onClose} className={`${stayButton.ghost} w-full`}>Done</button>
    </div>
  );
}

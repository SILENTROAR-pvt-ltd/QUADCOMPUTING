'use client';

import React from 'react';
import { ClipboardCheck, Smartphone } from 'lucide-react';

interface Props {
  guestName: string; code: string | null; paidAmount: number | null; selfEnabled: boolean;
  /** "At the desk" happens in this room's panel (no room to pick). */
  inRoom?: boolean;
  onSelf: () => void; onDesk: () => void; onCancel?: () => void;
}

const card = 'flex flex-col rounded-2xl border bg-white p-4 text-left';
const step = 'flex gap-2 text-xs leading-snug text-neutral-700';
const num = 'grid h-4 w-4 shrink-0 place-items-center rounded-full bg-neutral-900 text-[9px] font-bold text-white';
const go = 'inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-xl text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50';
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/**
 * The first question when a guest with a reservation arrives: do they check themselves in on their phone, or does the
 * desk do it? Each way says, step by step, what happens and where the money is taken, so nobody skips the guest's
 * details: on the phone they add their ID photo and consent; at the desk the ID number and consent are required.
 */
export function ArrivalChoice({ guestName, code, paidAmount, selfEnabled, inRoom = false, onSelf, onDesk, onCancel }: Props) {
  const first = guestName.trim().split(/\s+/)[0] || 'the guest';
  const paid = paidAmount !== null;
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4" role="group" aria-label={`How ${first} checks in`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-neutral-950">How is {first} checking in?</p>
        <p className="flex items-center gap-2 text-[11px]">
          {code && <span className="rounded-md bg-white px-1.5 py-0.5 font-mono text-neutral-800 ring-1 ring-neutral-200">{code}</span>}
          <span className={`rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${paid ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-amber-200'}`}>{paid ? `Paid ${inr(paidAmount!)}` : 'Not paid yet'}</span>
          {onCancel && <button type="button" onClick={onCancel} className="cursor-pointer font-semibold text-neutral-500 underline underline-offset-2 hover:text-neutral-900">Cancel</button>}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className={`${card} border-neutral-200`}>
          <p className="flex items-center gap-2 text-sm font-semibold text-neutral-950"><Smartphone className="h-4 w-4" aria-hidden /> On their phone</p>
          <p className="text-[11px] text-neutral-500">Self check-in</p>
          <ol className="mt-2.5 space-y-1.5">
            <li className={step}><span className={num}>1</span>{paid ? `Already paid ${inr(paidAmount!)}` : 'Take the room payment: UPI, cash or card'}</li>
            <li className={step}><span className={num}>2</span>They scan the check-in QR or open the link</li>
            <li className={step}><span className={num}>3</span>They add their ID photo and consent; a room opens for them</li>
          </ol>
          {!selfEnabled && <p className="mt-2 text-[11px] font-medium text-amber-800">Self check-in is off. Turn it on under Room setup.</p>}
          <div className="mt-auto pt-3">
            <button type="button" onClick={onSelf} disabled={!selfEnabled} className={`${go} bg-neutral-950 text-white hover:bg-neutral-800`}>
              {paid ? 'Show check-in QR' : 'Take payment & get link'}
            </button>
          </div>
        </div>
        <div className={`${card} border-neutral-200`}>
          <p className="flex items-center gap-2 text-sm font-semibold text-neutral-950"><ClipboardCheck className="h-4 w-4" aria-hidden /> At the desk</p>
          <p className="text-[11px] text-neutral-500">You fill it in</p>
          <ol className="mt-2.5 space-y-1.5">
            <li className={step}><span className={num}>1</span>{inRoom ? 'Check the details filled in from the booking' : 'Pick the room'}</li>
            <li className={step}><span className={num}>2</span>See the ID; enter its number and confirm consent</li>
            <li className={step}><span className={num}>3</span>{paid ? `The ${inr(paidAmount!)} paid carries over` : 'Take payment now, or at checkout'}</li>
          </ol>
          <div className="mt-auto pt-3">
            <button type="button" onClick={onDesk} className={`${go} border border-neutral-300 bg-white text-neutral-950 hover:bg-neutral-50`}>
              {inRoom ? 'Fill in here' : 'Check in at the desk'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

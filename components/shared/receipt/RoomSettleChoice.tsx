'use client';

import React from 'react';
import { HandCoins, LogOut } from 'lucide-react';
import type { RoomMode } from './useDigitalReceiptActions';

interface Props {
  billTotal: number;
  mode: RoomMode;
  amount: number;
  disabled: boolean;
  onMode: (m: RoomMode) => void;
  onAmount: (n: number) => void;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/**
 * A room bill at the till does one of two things, and the host says which before saving: adjust the money in the
 * running stay (a part payment, or the whole bill so far; the guest stays checked in and keeps ordering), or settle the
 * stay and check the guest out, which frees the room. Nothing checks a guest out unless this says so.
 */
export function RoomSettleChoice({ billTotal, mode, amount, disabled, onMode, onAmount }: Props) {
  // Compact on a phone (the till's receipt is a bottom sheet): the title says it all, the hint appears where there is room.
  const card = (on: boolean) => `flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors disabled:opacity-60 sm:items-start sm:p-3.5 ${on ? 'border-neutral-950 bg-neutral-50 ring-1 ring-neutral-950' : 'border-neutral-200 bg-white hover:border-neutral-400'}`;
  const hint = 'hidden text-[12px] leading-snug text-neutral-500 sm:block';
  const partial = mode === 'payment' && amount > 0 && amount < billTotal - 0.005;
  return (
    <div role="radiogroup" aria-label="What this payment does" className="space-y-2">
      <button type="button" role="radio" aria-checked={mode === 'payment'} disabled={disabled} onClick={() => onMode('payment')} className={card(mode === 'payment')}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-white"><HandCoins className="h-4 w-4" aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-neutral-950">Adjust in the stay · guest stays checked in</span>
          <span className={hint}>Take all or part of the bill now. It shows as paid on the guest&apos;s room page and the desk&apos;s folio; the rest is paid at checkout.</span>
        </span>
      </button>
      {mode === 'payment' && (
        <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 py-2">
          <label htmlFor="room-pay-amount" className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-neutral-500">Paying now</label>
          <span className="font-mono text-sm text-neutral-500">₹</span>
          <input id="room-pay-amount" inputMode="decimal" type="number" min={1} max={billTotal} step="1" value={amount || ''} disabled={disabled}
            onChange={(e) => onAmount(Math.min(billTotal, Math.max(0, Number(e.target.value) || 0)))}
            className="h-9 min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-2.5 font-mono text-sm text-neutral-950 outline-none focus:border-neutral-900" />
          {partial
            ? <button type="button" disabled={disabled} onClick={() => onAmount(billTotal)} className="shrink-0 cursor-pointer text-[11px] font-semibold text-neutral-700 underline underline-offset-2">Whole bill</button>
            : <span className="shrink-0 text-[11px] font-semibold text-emerald-800">Whole bill</span>}
        </div>
      )}
      {partial && <p className="px-1 text-[11.5px] text-neutral-600">{inr(amount)} now · {inr(billTotal - amount)} stays on the room bill.</p>}
      <button type="button" role="radio" aria-checked={mode === 'checkout'} disabled={disabled} onClick={() => onMode('checkout')} className={card(mode === 'checkout')}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-950 text-white"><LogOut className="h-4 w-4" aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-neutral-950">Check out &amp; settle · frees the room</span>
          <span className={hint}>The final invoice for the whole stay is issued, the room goes to housekeeping and the guest&apos;s room page closes.</span>
        </span>
      </button>
    </div>
  );
}

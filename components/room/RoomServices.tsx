'use client';

import React, { useState } from 'react';
import { BedDouble, Droplets, Bell, Shirt, Send, Check } from 'lucide-react';
import { stayButton } from '@/components/stay/StayShell';
import { LateCheckout } from './LateCheckout';
import { CheckoutRequest } from './CheckoutRequest';
import { RoomFrontDesk } from './RoomFrontDesk';
import type { RoomState } from './useRoomStay';

interface Props {
  data: RoomState;
  onRequest: (kind: string, message?: string) => Promise<string>;
  onRequestLate: (optionId: string) => Promise<string>;
  onRequestCheckout: (action: 'request' | 'cancel', note?: string) => Promise<string>;
  onOpenBill: () => void;
}

const REQUESTS = [
  { kind: 'housekeeping', label: 'Housekeeping', hint: 'Make up the room', Icon: BedDouble },
  { kind: 'water', label: 'Drinking water', hint: 'Extra bottles', Icon: Droplets },
  { kind: 'towels', label: 'Towels', hint: 'Fresh towels', Icon: Shirt },
  { kind: 'front_desk', label: 'Front desk', hint: 'Please call the room', Icon: Bell },
];

/** One-tap requests that ring on the host console, a free line for anything else, the desk's number, and late check-out. */
export function RoomServices({ data, onRequest, onRequestLate, onRequestCheckout, onOpenBill }: Props) {
  const [sent, setSent] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [custom, setCustom] = useState('');

  const send = async (kind: string, message?: string) => {
    setBusy(kind);
    const result = await onRequest(kind, message);
    setSent((s) => ({ ...s, [kind]: result }));
    setBusy(null);
    setTimeout(() => setSent((s) => { const c = { ...s }; delete c[kind]; return c; }), 4000);
  };

  return (
    <div className="space-y-4">
      <RoomFrontDesk data={data} variant="card" />
      <div className="grid grid-cols-2 gap-3">
        {REQUESTS.map(({ kind, label, hint, Icon }) => {
          const done = Boolean(sent[kind]);
          return (
            <button key={kind} type="button" disabled={busy !== null} onClick={() => void send(kind)}
              className={`cursor-pointer rounded-[1.5rem] border bg-white p-4 text-left transition active:scale-[0.98] disabled:opacity-60 ${done ? 'border-emerald-300 ring-4 ring-emerald-500/10' : 'border-neutral-200 hover:border-neutral-900'}`}>
              <span className={`grid h-10 w-10 place-items-center rounded-full ${done ? 'bg-emerald-600 text-white' : 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'}`}>
                {done ? <Check className="h-5 w-5" strokeWidth={3} aria-hidden /> : busy === kind ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" /> : <Icon className="h-5 w-5" aria-hidden />}
              </span>
              <span className="mt-3 block text-lg text-neutral-950" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{label}</span>
              <span className={`block text-xs ${done ? 'text-emerald-700' : 'text-neutral-500'}`}>{sent[kind] || hint}</span>
            </button>
          );
        })}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (custom.trim()) { void send('custom', custom.trim()); setCustom(''); } }} className="flex gap-2">
        <input value={custom} onChange={(e) => setCustom(e.target.value.slice(0, 140))} placeholder="Anything else? (an iron, a taxi, more pillows…)" className={stayButton.input} />
        <button type="submit" disabled={!custom.trim() || busy !== null} aria-label="Send request" className={`${stayButton.primary} w-12 shrink-0 !px-0`}><Send className="h-4 w-4" aria-hidden /></button>
      </form>
      {sent.custom && <p role="status" className="text-xs text-emerald-700">{sent.custom}</p>}
      {/* Leaving: check out now, or stay on at the owner's rate while the room is free after the guest. */}
      <p className="px-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Checking out</p>
      <CheckoutRequest data={data} onRequest={onRequestCheckout} onOpenBill={onOpenBill} />
      {data.late_checkout && !data.checkout_request && <LateCheckout late={data.late_checkout} onRequest={onRequestLate} />}
      <p className="px-1 text-center text-[11px] text-neutral-400">Requests reach the desk and housekeeping at once. For anything urgent, use the room phone.</p>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import type { PhysicalRoom } from '@/types';

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : '');

/**
 * The guest has asked to check out from their room page. The desk settles and checks them out (the usual button, which
 * clears the request), or dismisses it if they changed their mind or it was handled in person.
 */
export function CheckoutRequestPanel({ room, balance, onSettle, settling, onChanged }: { room: PhysicalRoom; balance: number | null; onSettle: () => void; settling: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const req = room.checkout_request;
  if (req?.status !== 'pending') return null;

  const dismiss = async () => {
    setBusy(true);
    const res = await fetch(`/api/host/accommodations/rooms/${room.id}/checkout-request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'dismiss' }) }).catch(() => null);
    setBusy(false);
    if (res?.ok) onChanged(); else setMessage('Could not clear the request. Please try again.');
  };

  return (
    <section role="status" className="rounded-3xl border border-emerald-300 bg-emerald-50 p-5 ring-4 ring-emerald-500/10">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-600 text-white"><LogOut className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-neutral-950">{room.guest_name || 'The guest'} is ready to check out</p>
          <p className="text-xs text-neutral-700">Asked {when(req.requested_at)}.{balance !== null && ` Balance to collect: ₹${balance.toLocaleString('en-IN')}.`}{req.note && ` “${req.note}”`}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={settling || busy} onClick={onSettle} className="h-9 cursor-pointer rounded-lg bg-neutral-950 px-4 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50">{settling ? 'Opening…' : 'Settle & check out'}</button>
            <button type="button" disabled={busy || settling} onClick={() => void dismiss()} className="h-9 cursor-pointer rounded-lg border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50">Dismiss</button>
          </div>
          {message && <p role="alert" className="mt-2 text-xs text-rose-700">{message}</p>}
        </div>
      </div>
    </section>
  );
}

'use client';

import React, { useState } from 'react';
import { LogOut, Check, Receipt } from 'lucide-react';
import { inr, whenIst } from '@/components/stay/stay-format';
import { stayButton } from '@/components/stay/StayShell';
import type { RoomState } from './useRoomStay';

interface Props { data: RoomState; onRequest: (action: 'request' | 'cancel', note?: string) => Promise<string>; onOpenBill: () => void }

/**
 * "I am ready to leave": one tap tells the desk to prepare the bill. The bill is paid and the checkout done at the
 * desk; this page shows the request waiting until then, and lets the guest take it back.
 */
export function CheckoutRequest({ data, onRequest, onOpenBill }: Props) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  // A "pay now" request lives on the bill tab; here only the check-out itself counts as pending.
  const req = data.checkout_request?.kind === 'checkout' ? data.checkout_request : null;
  const balance = data.folio?.balance || 0;

  const act = async (action: 'request' | 'cancel') => {
    setBusy(true);
    setStatus(await onRequest(action, note.trim() || undefined));
    setBusy(false);
    setNote('');
  };

  return (
    <section id="checkout-request" className={`scroll-mt-28 rounded-[1.5rem] border p-5 ${req ? 'border-emerald-300 bg-emerald-50/70 ring-4 ring-emerald-500/10' : 'border-neutral-200 bg-white'}`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${req ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-800'}`}>
          {req ? <Check className="h-5 w-5" strokeWidth={3} aria-hidden /> : <LogOut className="h-5 w-5" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-medium text-neutral-950" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{req ? 'Check-out requested' : 'Ready to check out?'}</h3>
          <p className="text-xs text-neutral-600">
            {req
              ? `Asked ${whenIst(req.requested_at)}. The desk is preparing your bill: ${balance > 0 ? `${inr(balance)} to pay at the desk` : 'nothing left to pay'}, then you are checked out.`
              : `Tell the desk you are leaving and they will have your bill ready${balance > 0 ? ` (${inr(balance)} so far)` : ''}. You pay at the desk by UPI, cash or card.`}
          </p>
        </div>
      </div>

      {req ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={onOpenBill} className={stayButton.primarySm}><Receipt className="h-3.5 w-3.5" aria-hidden /> See my bill</button>
          <button type="button" disabled={busy} onClick={() => void act('cancel')} className={stayButton.ghostSm}>Not leaving yet</button>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 100))} placeholder="Anything for the desk? (a taxi, luggage, a receipt by email…)" className={stayButton.input} />
          <button type="button" disabled={busy} onClick={() => void act('request')} className={`${stayButton.primary} w-full`}>
            {busy ? 'Telling the desk…' : <><LogOut className="h-4 w-4" aria-hidden /> Request check-out</>}
          </button>
        </div>
      )}
      {status && <p role="status" className="mt-3 text-xs text-emerald-700">{status}</p>}
    </section>
  );
}

'use client';

import React, { useState } from 'react';
import { Check, HandCoins } from 'lucide-react';
import { inr, whenIst } from '@/components/stay/stay-format';
import { stayButton } from '@/components/stay/StayShell';
import type { RoomState } from './useRoomStay';

interface Props { data: RoomState; onRequest: (action: 'request' | 'cancel') => Promise<string> }

/**
 * Paying before leaving: one tap tells the desk the guest wants to settle what stands on the bill now. The desk comes
 * with the UPI QR, or takes cash or card, and records it; the bill then shows it as paid and only what comes after
 * is pending. The stay goes on.
 */
export function RoomPayNow({ data, onRequest }: Props) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const balance = data.folio?.balance || 0;
  const req = data.checkout_request?.kind === 'bill' ? data.checkout_request : null;
  if (!req && balance <= 0) return null;

  const act = async (action: 'request' | 'cancel') => { setBusy(true); setStatus(await onRequest(action)); setBusy(false); };

  if (req) {
    return (
      <div className="mt-4 rounded-2xl border border-emerald-300 bg-white px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900"><Check className="h-4 w-4 text-emerald-700" strokeWidth={3} aria-hidden /> Payment requested · {whenIst(req.requested_at)}</p>
        <p className="mt-0.5 text-xs text-neutral-600">The desk is on its way to take {inr(balance)}: UPI QR, cash or card. Once recorded, it shows here as paid.</p>
        <div className="mt-3 flex items-center gap-2">
          <button type="button" disabled={busy} onClick={() => void act('cancel')} className={stayButton.ghostSm}>Not now</button>
          {status && <span role="status" className="text-xs text-emerald-700">{status}</span>}
        </div>
      </div>
    );
  }
  return (
    <div className="mt-4">
      <button type="button" disabled={busy} onClick={() => void act('request')} className={`${stayButton.primarySm} w-full`}>
        <HandCoins className="h-4 w-4" aria-hidden /> {busy ? 'Telling the desk…' : `Pay ${inr(balance)} now`}
      </button>
      <p className="mt-1.5 text-center text-[11px] text-neutral-500">Or pay at checkout. The desk takes UPI, cash or card either way.</p>
      {status && <p role="status" className="mt-1 text-center text-xs text-emerald-700">{status}</p>}
    </div>
  );
}

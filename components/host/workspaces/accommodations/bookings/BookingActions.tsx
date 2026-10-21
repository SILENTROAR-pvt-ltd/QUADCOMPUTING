'use client';

import React, { useState } from 'react';
import { Banknote, KeyRound, Link2 } from 'lucide-react';
import type { StayBooking } from './useStayBookings';

interface Props {
  booking: StayBooking; busy: boolean; choosing: boolean;
  onToggleChoose: () => void; onCollect: () => void; onShowLink: () => void;
  onConfirm: () => void; onNoShow: () => void; onCancel: () => void; onRefundCancel: () => void;
}

const btn = 'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[11px] font-semibold text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50';
const primary = 'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-neutral-950 px-3 text-[11px] font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * What the desk can do with an open booking. Not yet paid: take the room payment (the guest then gets a check-in link),
 * or check them in at the desk as before. Paid: show the link again, check in at the desk (the advance carries over),
 * or refund and cancel, which needs a second tap because money is involved.
 */
export function BookingActions({ booking: x, busy, choosing, onToggleChoose, onCollect, onShowLink, onConfirm, onNoShow, onCancel, onRefundCancel }: Props) {
  const [sure, setSure] = useState(false);
  const paid = Boolean(x.pass);
  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      {paid
        ? <button type="button" disabled={busy} onClick={onShowLink} className={primary}><Link2 className="h-3 w-3" /> Check-in link</button>
        : <button type="button" disabled={busy} onClick={onCollect} className={primary}><Banknote className="h-3 w-3" /> Take payment</button>}
      <button type="button" disabled={busy} onClick={onToggleChoose} aria-expanded={choosing} className={btn}><KeyRound className="h-3 w-3" /> Check in at desk</button>
      {x.status === 'requested' && <button type="button" disabled={busy} onClick={onConfirm} className={`${btn} border-emerald-200 text-emerald-800`}>Confirm</button>}
      {paid ? (
        sure
          ? <button type="button" disabled={busy} onClick={() => { setSure(false); onRefundCancel(); }} className={`${btn} border-rose-300 bg-rose-50 text-rose-800`}>Confirm refund &amp; cancel</button>
          : <button type="button" disabled={busy} onClick={() => setSure(true)} className={`${btn} text-rose-700`}>Refund &amp; cancel</button>
      ) : (
        <>
          <button type="button" disabled={busy} onClick={onNoShow} className={btn}>No-show</button>
          <button type="button" disabled={busy} onClick={onCancel} className={`${btn} text-rose-700`}>Cancel</button>
        </>
      )}
    </div>
  );
}

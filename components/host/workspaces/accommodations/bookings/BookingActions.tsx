'use client';

import React, { useState } from 'react';
import { DoorOpen, Link2 } from 'lucide-react';
import type { StayBooking } from './useStayBookings';

interface Props {
  booking: StayBooking; busy: boolean; arriving: boolean;
  onArrived: () => void; onShowLink: () => void;
  onConfirm: () => void; onNoShow: () => void; onCancel: () => void; onRefundCancel: () => void;
}

const btn = 'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-[11px] font-semibold text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50';
const primary = 'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-neutral-950 px-3 text-[11px] font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * What the desk can do with an open booking. One way in when the guest arrives: "Guest arrived" asks first whether they
 * check in on their phone or at the desk (ArrivalChoice). A paid booking can have its check-in link shown again before
 * arrival; refund and cancel needs a second tap because money is involved.
 */
export function BookingActions({ booking: x, busy, arriving, onArrived, onShowLink, onConfirm, onNoShow, onCancel, onRefundCancel }: Props) {
  const [sure, setSure] = useState(false);
  const paid = Boolean(x.pass);
  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={onArrived} aria-expanded={arriving} className={primary}><DoorOpen className="h-3 w-3" /> Guest arrived</button>
      {paid && <button type="button" disabled={busy} onClick={onShowLink} className={btn}><Link2 className="h-3 w-3" /> Check-in link</button>}
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

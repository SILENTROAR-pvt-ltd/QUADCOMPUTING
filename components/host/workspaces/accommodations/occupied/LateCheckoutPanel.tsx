'use client';

import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import type { PhysicalRoom } from '@/types';
import { useStaySettings } from '../bookings/useStaySettings';
import { CollectSheet } from '../bookings/collect/CollectSheet';
import type { CollectSpec } from '../bookings/collect/useCollect';

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : null);

/**
 * Late check-out for an in-house guest. The guest may have asked from their room page; the desk can also offer it. Approving
 * takes the fee (direct UPI, cash or card), moves the check-out time and puts the fee on the bill as a credit already paid.
 */
export function LateCheckoutPanel({ room, onChanged }: { room: PhysicalRoom; onChanged: () => void }) {
  const { settings } = useStaySettings();
  const [spec, setSpec] = useState<CollectSpec | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const options = settings?.stay_policies.late_checkout || [];
  const req = room.late_checkout_request;
  const granted = (room.stay_extras || []).filter((e) => e.type === 'late_checkout');
  if (options.length === 0 && !req && granted.length === 0) return null;

  const decline = async () => {
    setBusy(true);
    const res = await fetch(`/api/host/accommodations/rooms/${room.id}/late-checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'decline' }) }).catch(() => null);
    setBusy(false);
    if (res?.ok) onChanged(); else setMessage('Could not decline. Please try again.');
  };

  return (
    <section className={`rounded-3xl border p-5 ${req?.status === 'pending' ? 'border-amber-200 bg-amber-50/70' : 'border-neutral-200 bg-white'}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-amber-700 ring-1 ring-inset ring-amber-200"><Clock className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-neutral-950">Late check-out</p>
          <p className="text-xs text-neutral-600">Check-out is {when(room.check_out_time || room.check_out_date) || 'not set'}.{granted.length > 0 && ` Extended once already (${granted[granted.length - 1].name}).`}</p>

          {req?.status === 'pending' && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-white p-3.5">
              <p className="text-sm font-semibold text-neutral-950">The guest asks: {req.label}</p>
              <p className="text-xs text-neutral-600">Fee ₹{req.fee.toLocaleString('en-IN')}, taken now and credited to their bill.</p>
              <div className="mt-3 flex gap-2">
                <button type="button" disabled={busy} onClick={() => setSpec({ kind: 'late', roomId: room.id, optionId: req.option_id })} className="h-9 cursor-pointer rounded-lg bg-neutral-950 px-4 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50">Approve &amp; take payment</button>
                <button type="button" disabled={busy} onClick={() => void decline()} className="h-9 cursor-pointer rounded-lg border border-neutral-200 bg-white px-4 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50">Decline</button>
              </div>
            </div>
          )}

          {req?.status !== 'pending' && options.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {options.map((o) => (
                <button key={o.id} type="button" onClick={() => setSpec({ kind: 'late', roomId: room.id, optionId: o.id })} className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left text-xs font-semibold text-neutral-800 hover:border-neutral-900">
                  {o.label}<span className="block font-normal text-neutral-500">{o.fee_type === 'percent' ? `${o.value}% of a night` : `₹${o.value.toLocaleString('en-IN')}`}</span>
                </button>
              ))}
            </div>
          )}
          {message && <p role="alert" className="mt-2 text-xs text-rose-700">{message}</p>}
        </div>
      </div>
      {spec && <CollectSheet spec={spec} categories={[]} settings={settings} onClose={() => setSpec(null)} onToast={setMessage} onRecorded={onChanged} />}
    </section>
  );
}

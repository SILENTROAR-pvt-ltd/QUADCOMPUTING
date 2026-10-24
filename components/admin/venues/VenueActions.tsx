'use client';

import React, { useState } from 'react';
import { adminSend } from '../ui/useAdminData';
import type { VenueRow } from './types';

const input = 'h-9 rounded-lg border border-[#e3e3df] bg-white px-2.5 text-[13px] outline-none focus:border-neutral-900';
const btn = 'h-9 rounded-lg px-3 text-[12.5px] font-semibold disabled:opacity-40 cursor-pointer';
const dark = `${btn} bg-[#0b0b0b] text-white hover:bg-neutral-800`;
const ghost = `${btn} border border-[#e3e3df] text-neutral-800 hover:bg-neutral-50`;

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-2 border-t border-[#f0f0ed] pt-4"><p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{title}</p>{children}</div>;
}

/** Everything a super admin can change on a venue. Each change is applied at once and written to the admin log. */
export function VenueActions({ venue, onDone }: { venue: VenueRow; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tier, setTier] = useState('m2_pro'); const [days, setDays] = useState(365);
  const [trialTier, setTrialTier] = useState('m2_pro'); const [trialDays, setTrialDays] = useState(30);
  const [extend, setExtend] = useState(30); const [vibeyDays, setVibeyDays] = useState(365);
  const [reason, setReason] = useState(''); const [review, setReview] = useState(venue.review?.status || 'approved'); const [note, setNote] = useState(venue.review?.note || '');
  const suspended = venue.plan.status === 'suspended';

  const run = async (body: Record<string, unknown>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true); setMsg(null);
    const r = await adminSend(`/api/admin/venues/${venue.id}`, 'POST', body);
    setBusy(false); setMsg({ ok: r.ok, text: r.message });
    if (r.ok) onDone();
  };

  return (
    <div className="space-y-4">
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`rounded-xl border px-3 py-2 text-[13px] ${msg.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{msg.text}</p>}
      <Group title="Plan">
        <div className="flex flex-wrap gap-2">
          <select value={tier} onChange={(e) => setTier(e.target.value)} className={input} aria-label="Plan"><option value="m1_pro">M¹-Pro</option><option value="m2_pro">M²-Pro</option><option value="rhodium_annual">Rhodium Pro</option></select>
          <input type="number" min={1} max={1100} value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${input} w-20`} aria-label="Days" />
          <button type="button" disabled={busy} onClick={() => void run({ action: 'set_plan', planTier: tier, days }, `Give ${venue.name} this plan for ${days} days without payment?`)} className={dark}>Give plan</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={trialTier} onChange={(e) => setTrialTier(e.target.value)} className={input} aria-label="Free month plan"><option value="m1_pro">M¹-Pro</option><option value="m2_pro">M²-Pro</option></select>
          <input type="number" min={1} max={90} value={trialDays} onChange={(e) => setTrialDays(Number(e.target.value))} className={`${input} w-20`} aria-label="Free days" />
          <button type="button" disabled={busy} onClick={() => void run({ action: 'start_trial', planTier: trialTier, days: trialDays })} className={ghost}>Start free month</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <input type="number" min={1} max={730} value={extend} onChange={(e) => setExtend(Number(e.target.value))} className={`${input} w-20`} aria-label="Extend by days" />
          <button type="button" disabled={busy} onClick={() => void run({ action: 'extend', days: extend })} className={ghost}>Extend plan / trial</button>
          <button type="button" disabled={busy} onClick={() => void run({ action: 'to_per_bill' }, `Move ${venue.name} to You earn, we earn (₹3 a bill) now?`)} className={ghost}>Move to ₹3 a bill</button>
        </div>
      </Group>
      <Group title="Vibey and setup">
        <div className="flex flex-wrap gap-2">
          <input type="number" min={1} max={730} value={vibeyDays} onChange={(e) => setVibeyDays(Number(e.target.value))} className={`${input} w-20`} aria-label="Vibey days" />
          <button type="button" disabled={busy} onClick={() => void run({ action: 'set_vibey', days: vibeyDays })} className={ghost}>Add Vibey</button>
          {venue.plan.vibeyUntil && <button type="button" disabled={busy} onClick={() => void run({ action: 'end_vibey' }, 'End the Vibey add-on now?')} className={ghost}>End Vibey</button>}
          {!venue.plan.setupPaid && <button type="button" disabled={busy} onClick={() => void run({ action: 'waive_setup' }, 'Waive the ₹599 setup for this venue?')} className={ghost}>Waive ₹599 setup</button>}
        </div>
      </Group>
      <Group title="Access">
        {suspended
          ? <button type="button" disabled={busy} onClick={() => void run({ action: 'resume' })} className={dark}>Resume venue</button>
          : <div className="flex flex-wrap gap-2">
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (kept in the admin log)" className={`${input} min-w-[12rem] flex-1`} aria-label="Suspension reason" />
              <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => void run({ action: 'suspend', reason }, `Suspend ${venue.name}? Guests will not be able to order until you resume it.`)}
                className={`${btn} bg-rose-600 text-white hover:bg-rose-700`}>Suspend</button>
            </div>}
      </Group>
      <Group title="Review">
        <div className="flex flex-wrap gap-2">
          <select value={review} onChange={(e) => setReview(e.target.value)} className={input} aria-label="Review status">
            <option value="approved">Approve</option><option value="needs_docs">Request documents</option><option value="rejected">Reject</option><option value="pending">Back to review</option>
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (documents missing, why)" className={`${input} min-w-[12rem] flex-1`} aria-label="Review note" />
          <button type="button" disabled={busy} onClick={() => void run({ action: 'review', status: review, note })} className={dark}>Save review</button>
        </div>
      </Group>
    </div>
  );
}

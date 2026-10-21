'use client';

import React from 'react';
import { stayButton } from '../StayShell';
import type { CheckInForm, PassView } from './useSelfCheckIn';

interface Props { pass: PassView; form: CheckInForm; update: (patch: Partial<CheckInForm>) => void; busy: boolean; onBack: () => void; onSubmit: () => void }

/** Step 3: the privacy consent, then the check-in itself. The room is chosen by the system from the type that was paid for. */
export function ConfirmStep({ pass, form, update, busy, onBack, onSubmit }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
        <p className="font-semibold text-neutral-950">{form.guestName.trim() || pass.guest_first_name} · {pass.guests === form.totalGuests ? pass.guests : form.totalGuests} guest{form.totalGuests === 1 ? '' : 's'}</p>
        <p className="mt-1 text-xs text-neutral-500">A {pass.room_type || 'room'} will be given to you as soon as you confirm. Your ID photo is seen only by the front desk.</p>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
        <input type="checkbox" checked={form.consent} onChange={(e) => update({ consent: e.target.checked })} className="mt-0.5 h-4 w-4 accent-neutral-950" />
        <span>I agree that the venue may keep my details and ID for this stay, as the law requires, and use them only for it.<span className="block text-xs text-neutral-500">You can ask the venue to erase them after the mandatory retention period.</span></span>
      </label>
      <div className="flex gap-3">
        <button type="button" onClick={onBack} disabled={busy} className={`${stayButton.ghost} flex-1`}>Back</button>
        <button type="button" disabled={!form.consent || busy} onClick={onSubmit} className={`${stayButton.primary} flex-[2]`}>{busy ? 'Checking you in…' : 'Check in now'}</button>
      </div>
    </div>
  );
}

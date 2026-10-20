'use client';

import React from 'react';
import { addDays, todayIst } from '../stay-format';
import { stayButton } from '../StayShell';
import type { CheckInForm } from './useSelfCheckIn';

interface Props { form: CheckInForm; update: (patch: Partial<CheckInForm>) => void; idTypes: string[]; onNext: () => void }

const label = 'mb-1.5 block text-[10px] font-mono uppercase tracking-widest text-neutral-500';

/** Step 1: who is staying, for how many nights, and which ID they will photograph. */
export function GuestDetailsFields({ form, update, idTypes, onNext }: Props) {
  const ready = form.guestName.trim().length >= 2 && /^[0-9]{10}$/.test(form.guestPhone) && form.checkOut > todayIst();
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (ready) onNext(); }} className="space-y-4">
      <div>
        <span className={label}>Guest name</span>
        <input required minLength={2} maxLength={60} value={form.guestName} onChange={(e) => update({ guestName: e.target.value })} className={stayButton.input} autoComplete="name" placeholder="As on the ID" />
      </div>
      <div>
        <span className={label}>Mobile number</span>
        <input required inputMode="numeric" value={form.guestPhone} onChange={(e) => update({ guestPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })} className={stayButton.input} autoComplete="tel" placeholder="10 digits · the room QR unlocks with its last 4" />
      </div>
      <div>
        <span className={label}>Email (optional)</span>
        <input type="email" value={form.guestEmail} onChange={(e) => update({ guestEmail: e.target.value })} className={stayButton.input} autoComplete="email" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className={label}>Guests</span>
          <input type="number" min={1} max={20} value={form.totalGuests} onChange={(e) => update({ totalGuests: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} className={stayButton.input} />
        </div>
        <div>
          <span className={label}>Check-out</span>
          <input type="date" min={addDays(todayIst(), 1)} value={form.checkOut} onChange={(e) => update({ checkOut: e.target.value })} className={`${stayButton.input} [color-scheme:dark]`} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className={label}>ID type</span>
          <select value={form.idType} onChange={(e) => update({ idType: e.target.value })} className={stayButton.input}>
            {idTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <span className={label}>ID number (optional)</span>
          <input maxLength={40} value={form.idNumber} onChange={(e) => update({ idNumber: e.target.value })} className={stayButton.input} placeholder="Last 4 digits are enough" />
        </div>
      </div>
      <button type="submit" disabled={!ready} className={`${stayButton.primary} w-full`}>Next · photograph the ID</button>
    </form>
  );
}

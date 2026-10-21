'use client';

import React from 'react';
import { stayButton } from '../StayShell';
import { ID_TYPES, type CheckInForm } from './useSelfCheckIn';

interface Props { form: CheckInForm; update: (patch: Partial<CheckInForm>) => void; onNext: () => void }

const label = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-neutral-500';

/** Step 1: the name as on the ID, an email, how many are staying, and which ID will be photographed. The phone and the room come from the pass. */
export function GuestDetailsFields({ form, update, onNext }: Props) {
  const ready = form.guestName.trim().length >= 2 && (!form.foreign || (form.passportNumber.trim().length >= 4 && form.countryOfOrigin.trim().length >= 2));
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (ready) onNext(); }} className="space-y-4">
      <div>
        <span className={label}>Guest name</span>
        <input required minLength={2} maxLength={60} value={form.guestName} onChange={(e) => update({ guestName: e.target.value })} className={stayButton.input} autoComplete="name" placeholder="As on the ID" />
      </div>
      <div>
        <span className={label}>Email (optional)</span>
        <input type="email" value={form.guestEmail} onChange={(e) => update({ guestEmail: e.target.value })} className={stayButton.input} autoComplete="email" placeholder="For your invoice" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className={label}>Guests</span>
          <input type="number" min={1} max={20} value={form.totalGuests} onChange={(e) => update({ totalGuests: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} className={stayButton.input} />
        </div>
        <div>
          <span className={label}>ID type</span>
          <select value={form.idType} onChange={(e) => update({ idType: e.target.value })} className={stayButton.input}>{ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        </div>
      </div>
      <div>
        <span className={label}>ID number (optional)</span>
        <input maxLength={40} value={form.idNumber} onChange={(e) => update({ idNumber: e.target.value })} className={stayButton.input} placeholder="The last 4 digits are enough" />
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-3.5 text-sm text-neutral-700">
        <input type="checkbox" checked={form.foreign} onChange={(e) => update({ foreign: e.target.checked })} className="mt-0.5 h-4 w-4 accent-neutral-950" />
        <span>I am not an Indian citizen<span className="block text-xs text-neutral-500">The law asks for a passport and country for every foreign guest.</span></span>
      </label>
      {form.foreign && (
        <div className="grid grid-cols-2 gap-3">
          <div><span className={label}>Passport number</span><input value={form.passportNumber} onChange={(e) => update({ passportNumber: e.target.value.slice(0, 40) })} className={stayButton.input} /></div>
          <div><span className={label}>Country</span><input value={form.countryOfOrigin} onChange={(e) => update({ countryOfOrigin: e.target.value.slice(0, 60) })} className={stayButton.input} /></div>
        </div>
      )}
      <button type="submit" disabled={!ready} className={`${stayButton.primary} w-full`}>Next · photograph the ID</button>
    </form>
  );
}

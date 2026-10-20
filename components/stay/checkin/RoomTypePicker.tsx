'use client';

import React from 'react';
import { inr, nightsBetween, plural, todayIst, type StayType } from '../stay-format';
import { stayButton } from '../StayShell';
import type { CheckInForm } from './useSelfCheckIn';

interface Props { types: StayType[]; form: CheckInForm; update: (patch: Partial<CheckInForm>) => void; busy: boolean; onBack: () => void; onSubmit: () => void }

/** Step 3: a booking code, or a room type with a room free right now; then the check-in itself. */
export function RoomTypePicker({ types, form, update, busy, onBack, onSubmit }: Props) {
  const nights = Math.max(1, nightsBetween(todayIst(), form.checkOut));
  const chosen = types.find((t) => t.id === form.categoryId);
  const ready = Boolean(form.bookingCode.trim()) || Boolean(chosen && chosen.vacant_now > 0);

  return (
    <div className="space-y-4">
      <div>
        <span className="mb-1.5 block text-[10px] font-mono uppercase tracking-widest text-neutral-500">Booking code (if you reserved)</span>
        <input value={form.bookingCode} onChange={(e) => update({ bookingCode: e.target.value.toUpperCase().slice(0, 9) })} placeholder="ST-XXXXXX" className={`${stayButton.input} font-mono tracking-wider`} />
      </div>

      <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-neutral-600"><span className="h-px flex-1 bg-neutral-800" /> or pick a room type <span className="h-px flex-1 bg-neutral-800" /></div>

      <div className="space-y-2">
        {types.map((t) => {
          const free = t.vacant_now > 0;
          const active = form.categoryId === t.id;
          return (
            <button key={t.id} type="button" disabled={!free} onClick={() => update({ categoryId: active ? '' : t.id, bookingCode: '' })}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${active ? 'border-amber-200/70 bg-amber-200/10' : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-600'} disabled:opacity-40`}>
              <span>
                <span className="block font-serif text-lg text-white">{t.name}</span>
                <span className="block text-xs text-neutral-400">{free ? `${t.vacant_now} free now` : 'None free right now'} · sleeps {t.occupancy}</span>
              </span>
              <span className="text-right">
                <span className="block font-serif text-lg text-white">{inr(t.price)}</span>
                <span className="block text-[10px] uppercase tracking-widest text-neutral-500">per night</span>
              </span>
            </button>
          );
        })}
      </div>

      {chosen && (
        <p className="text-xs text-neutral-400">{plural(nights, 'night')} · about <span className="text-white">{inr(chosen.price * nights)}</span>, paid at checkout with anything you order to the room.</p>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className={`${stayButton.ghost} flex-1`}>Back</button>
        <button type="button" disabled={!ready || busy} onClick={onSubmit} className={`${stayButton.primary} flex-[2]`}>{busy ? 'Checking you in…' : 'Check in'}</button>
      </div>
    </div>
  );
}

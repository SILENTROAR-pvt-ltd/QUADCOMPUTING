'use client';

import React from 'react';
import type { RoomCategory } from '@/types';
import type { WalkIn } from './useCollect';

interface Props { walk: WalkIn; categories: RoomCategory[]; onChange: (w: WalkIn) => void; onNext: () => void }

const input = 'h-11 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none focus:border-neutral-900';
const label = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-neutral-500';

/** A guest with no reservation: who, which room type, how many nights. The same payment and check-in link follow. */
export function WalkInForm({ walk, categories, onChange, onNext }: Props) {
  const set = (p: Partial<WalkIn>) => onChange({ ...walk, ...p });
  const ready = Boolean(walk.categoryId) && walk.guestName.trim().length >= 2 && /^[0-9]{10}$/.test(walk.guestPhone);
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (ready) onNext(); }} className="space-y-4">
      <div>
        <label htmlFor="wi-cat" className={label}>Room type</label>
        <select id="wi-cat" value={walk.categoryId} onChange={(e) => set({ categoryId: e.target.value })} className={input}>
          <option value="">Choose…</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name} · ₹{Number(c.price).toLocaleString('en-IN')}/night</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor="wi-nights" className={label}>Nights</label><input id="wi-nights" type="number" min={1} max={30} value={walk.nights} onChange={(e) => set({ nights: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })} className={input} /></div>
        <div><label htmlFor="wi-guests" className={label}>Guests</label><input id="wi-guests" type="number" min={1} max={20} value={walk.guests} onChange={(e) => set({ guests: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} className={input} /></div>
      </div>
      <div><label htmlFor="wi-name" className={label}>Guest name</label><input id="wi-name" value={walk.guestName} onChange={(e) => set({ guestName: e.target.value.slice(0, 60) })} autoComplete="off" className={input} /></div>
      <div><label htmlFor="wi-phone" className={label}>Mobile number</label><input id="wi-phone" inputMode="numeric" value={walk.guestPhone} onChange={(e) => set({ guestPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="10 digits" className={input} /></div>
      <button type="submit" disabled={!ready} className="h-12 w-full cursor-pointer rounded-xl bg-neutral-950 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40">See the amount</button>
    </form>
  );
}

'use client';

import React, { useState } from 'react';
import { CalendarPlus, X } from 'lucide-react';
import type { RoomCategory } from '@/types';
import { addDays, todayIst } from '@/components/stay/stay-format';
import type { StaySettings } from './useStaySettings';

interface Props { categories: RoomCategory[]; settings: StaySettings | null; onClose: () => void; onReserved: (code: string, guest: string) => void }

const input = 'h-11 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none focus:border-neutral-900';
const label = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-neutral-500';

/** The desk reserves a room for a guest who phoned or walked up: free, confirmed at once, with a code to give them. */
export function ReserveSheet({ categories, settings, onClose, onReserved }: Props) {
  const [f, setF] = useState({ categoryId: '', checkIn: todayIst(), nights: 1, guests: 2, name: '', phone: '', email: '', arrival: 'standard', note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const early = settings?.stay_policies.early_checkin || [];
  const ready = f.categoryId && f.name.trim().length >= 2 && /^[0-9]{10}$/.test(f.phone);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true); setError(null);
    const res = await fetch('/api/host/accommodations/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category_id: f.categoryId, check_in: f.checkIn, check_out: addDays(f.checkIn, f.nights), guests: f.guests, guest_name: f.name, guest_phone: f.phone, guest_email: f.email || null, note: f.note || null, expected_arrival: f.arrival }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok || !data.success) { setError(!res ? 'No connection. Nothing was reserved; check the network and try again.' : data.error || 'The reservation could not be made.'); return; }
    onReserved(data.code, f.name.trim());
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-neutral-950/40 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="fixed inset-0" onClick={() => { if (!busy) onClose(); }} />
      <form role="dialog" aria-modal="true" aria-label="New reservation" onSubmit={(e) => void submit(e)}
        className="relative z-10 flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-neutral-200 bg-neutral-50 shadow-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between gap-4 border-b border-neutral-200 bg-white px-6 py-4">
          <h2 className="flex items-center gap-2 font-serif text-xl text-neutral-950"><CalendarPlus className="h-5 w-5" /> New reservation</h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="cursor-pointer rounded-full p-2 text-neutral-500 hover:bg-neutral-100 disabled:opacity-40"><X className="h-5 w-5" /></button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div><label htmlFor="rs-cat" className={label}>Room type</label>
            <select id="rs-cat" value={f.categoryId} onChange={(e) => set({ categoryId: e.target.value })} className={input}>
              <option value="">Choose…</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name} · ₹{Number(c.price).toLocaleString('en-IN')}/night</option>)}
            </select></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 sm:col-span-1"><label htmlFor="rs-in" className={label}>Arrives</label><input id="rs-in" type="date" min={todayIst()} value={f.checkIn} onChange={(e) => set({ checkIn: e.target.value || todayIst() })} className={input} /></div>
            <div><label htmlFor="rs-n" className={label}>Nights</label><input id="rs-n" type="number" min={1} max={30} value={f.nights} onChange={(e) => set({ nights: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })} className={input} /></div>
            <div><label htmlFor="rs-g" className={label}>Guests</label><input id="rs-g" type="number" min={1} max={20} value={f.guests} onChange={(e) => set({ guests: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} className={input} /></div>
          </div>
          <div><label htmlFor="rs-name" className={label}>Guest name</label><input id="rs-name" value={f.name} onChange={(e) => set({ name: e.target.value.slice(0, 60) })} autoComplete="off" className={input} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="rs-phone" className={label}>Mobile number</label><input id="rs-phone" inputMode="numeric" value={f.phone} onChange={(e) => set({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="10 digits" className={input} /></div>
            <div><label htmlFor="rs-mail" className={label}>Email (optional)</label><input id="rs-mail" type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} className={input} /></div>
          </div>
          <div><label htmlFor="rs-arr" className={label}>Expected arrival</label>
            <select id="rs-arr" value={f.arrival} onChange={(e) => set({ arrival: e.target.value })} className={input}>
              <option value="standard">During the day</option>
              {early.map((o) => <option key={o.id} value={`early:${o.id}`}>{o.label}</option>)}
              <option value="late">Late at night</option>
            </select></div>
          <div><label htmlFor="rs-note" className={label}>Note (optional)</label><input id="rs-note" value={f.note} onChange={(e) => set({ note: e.target.value.slice(0, 300) })} className={input} /></div>
          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">{error}</p>}
        </div>
        <footer className="border-t border-neutral-200 bg-white p-4">
          <button type="submit" disabled={!ready || busy} className="h-12 w-full cursor-pointer rounded-xl bg-neutral-950 text-sm font-semibold text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40">{busy ? 'Reserving…' : 'Reserve · free'}</button>
        </footer>
      </form>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { inr, plural, shortDate, type StayType } from './stay-format';
import { stayButton } from './StayShell';

interface Props { venueId: string; type: StayType; checkIn: string; checkOut: string; nights: number; onClose: () => void }
interface Confirmed { code: string; room_type: string; check_in: string; check_out: string; nights: number; estimated_total: number; guest_name: string }

/** Name, phone, guests; confirmed at once with a code to show at the desk. Nothing is paid online. */
export function BookingSheet({ venueId, type, checkIn, checkOut, nights, onClose }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [guests, setGuests] = useState(Math.min(2, type.occupancy));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Confirmed | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/guest/stay/book', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue: venueId, category_id: type.id, guest_name: name, guest_phone: phone, guest_email: email || null, check_in: checkIn, check_out: checkOut, guests, note: note || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { setError(data.error || 'The booking could not be made. Please try again.'); return; }
      setDone(data.booking);
    } catch { setError('Network error. Check your connection and try again.'); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] border border-neutral-800 bg-neutral-950 p-6 sm:rounded-[2rem]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-200/80">{done ? 'Reserved' : 'Reserve'}</p>
            <h2 className="mt-1 font-serif text-2xl font-light text-white">{type.name}</h2>
            <p className="mt-1 text-xs text-neutral-400">{shortDate(checkIn)} → {shortDate(checkOut)} · {plural(nights, 'night')} · {inr(type.price * nights)} on arrival</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-neutral-400 hover:bg-neutral-900 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {done ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
              <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-200/80">Your booking code</p>
              <p className="mt-2 font-mono text-3xl font-semibold tracking-wider text-white">{done.code}</p>
              <p className="mt-2 text-xs text-emerald-100/80">Show this at the desk, or use it to self check-in. We have noted {done.guest_name}, {plural(done.nights, 'night')} in a {done.room_type}.</p>
            </div>
            <p className="text-xs leading-relaxed text-neutral-400">Pay at the property when you arrive. The venue may call the number you gave to confirm.</p>
            <button type="button" onClick={onClose} className={`${stayButton.ghost} w-full`}>Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <input required minLength={2} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name" className={stayButton.input} autoComplete="name" />
            <input required inputMode="numeric" pattern="[0-9]{10}" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile number" className={stayButton.input} autoComplete="tel" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className={stayButton.input} autoComplete="email" />
            <label className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900/80 px-4 py-3 text-sm text-neutral-300">
              <span>Guests</span>
              <span className="inline-flex items-center gap-3">
                <button type="button" onClick={() => setGuests((g) => Math.max(1, g - 1))} className="h-8 w-8 rounded-full border border-neutral-700 text-white">−</button>
                <span className="w-5 text-center font-mono text-white">{guests}</span>
                <button type="button" onClick={() => setGuests((g) => Math.min(20, g + 1))} className="h-8 w-8 rounded-full border border-neutral-700 text-white">+</button>
              </span>
            </label>
            <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} placeholder="Anything we should know? (optional)" rows={2} className={`${stayButton.input} h-auto py-3`} />
            {error && <p className="text-xs text-amber-200">{error}</p>}
            <button type="submit" disabled={busy} className={`${stayButton.primary} w-full`}>{busy ? 'Reserving…' : `Reserve · pay ${inr(type.price * nights)} on arrival`}</button>
          </form>
        )}
      </div>
    </div>
  );
}

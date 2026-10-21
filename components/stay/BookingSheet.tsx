'use client';

import React, { useState } from 'react';
import { X, BadgeCheck, Smartphone } from 'lucide-react';
import type { GuestAccountSummary } from '@/lib/guest/guest-account-client';
import { inr, plural, shortDate, type StayType } from './stay-format';
import { stayButton } from './StayShell';
import { BookingConfirmed, type Confirmed } from './BookingConfirmed';

interface Props { venueId: string; type: StayType; checkIn: string; checkOut: string; nights: number; account: GuestAccountSummary | null; onClose: () => void }

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };
const label = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-neutral-500';

/**
 * Name, phone, guests and when they expect to arrive; confirmed at once, free, with a code to show at the desk. A guest
 * signed in with a Vibers ID has the name filled in and the mobile taken from the account (the browser only sees it
 * masked; the server attaches the real one), unless they choose to give another number.
 */
export function BookingSheet({ venueId, type, checkIn, checkOut, nights, account, onClose }: Props) {
  const [name, setName] = useState(account?.display_name || '');
  const [phone, setPhone] = useState('');
  const [ownPhone, setOwnPhone] = useState(!account?.phone_masked);
  const [email, setEmail] = useState('');
  const [guests, setGuests] = useState(Math.min(2, type.occupancy));
  const [arrival, setArrival] = useState('standard');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Confirmed | null>(null);
  // The account's number can only be used while the account is still signed in; if it goes mid-form, ask for one.
  const masked = account?.phone_masked || null;
  const askPhone = ownPhone || !masked;

  const arrivals = [
    { id: 'standard', title: 'During the day', hint: 'From the standard check-in time' },
    ...(type.early_options || []).map((o) => ({ id: `early:${o.id}`, title: o.label, hint: o.fee > 0 ? `+${inr(o.fee)}, paid at the desk` : 'No charge' })),
    { id: 'late', title: 'Late at night', hint: 'We will keep your room ready' },
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/guest/stay/book', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue: venueId, category_id: type.id, guest_name: name, guest_phone: askPhone ? phone : '', guest_email: email || null, check_in: checkIn, check_out: checkOut, guests, note: note || null, expected_arrival: arrival }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        // The account's saved number was not a usable mobile: ask for one here rather than leave the guest stuck.
        if (!askPhone && /mobile number/i.test(String(data.error || ''))) { setOwnPhone(true); setError('Your Vibers ID has no valid mobile number saved. Enter one for this stay.'); return; }
        setError(data.error || 'The booking could not be made. Please try again.');
        return;
      }
      setDone(data.booking);
    } catch { setError('Network error. Check your connection and try again.'); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-900/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Reserve ${type.name}`} onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-[2rem] border border-[#e6d9b8] bg-[#faf9f6] p-6 shadow-2xl sm:rounded-[2rem]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-700">{done ? 'Reserved' : 'Reserve · free'}</p>
            <h2 className="mt-1 text-2xl font-medium text-neutral-950" style={serif}>{type.name}</h2>
            <p className="mt-1 text-xs text-neutral-500">{shortDate(checkIn)} → {shortDate(checkOut)} · {plural(nights, 'night')} · {inr(type.price * nights)} at the desk</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950"><X className="h-5 w-5" /></button>
        </div>

        {done ? <BookingConfirmed done={done} onClose={onClose} /> : (
          <form onSubmit={submit} className="mt-5 space-y-3">
            {account && (
              <p className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-800"><BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Reserving with your Vibers ID · {account.handle}</p>
            )}
            <input required minLength={2} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name" className={stayButton.input} autoComplete="name" />
            {askPhone ? (
              <input required inputMode="numeric" pattern="[0-9]{10}" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile number" className={stayButton.input} autoComplete="tel" autoFocus={Boolean(account)} />
            ) : (
              <div className="flex h-12 items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 text-sm">
                <span className="inline-flex items-center gap-2 text-neutral-800"><Smartphone className="h-4 w-4 text-neutral-400" aria-hidden /><span className="font-mono tracking-wider">{masked}</span><span className="text-xs text-neutral-400">from your Vibers ID</span></span>
                <button type="button" onClick={() => setOwnPhone(true)} className="cursor-pointer text-xs font-semibold text-neutral-700 underline-offset-2 hover:underline">Use another</button>
              </div>
            )}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className={stayButton.input} autoComplete="email" />
            <div className="flex h-12 items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-700">
              <span>Guests</span>
              <span className="inline-flex items-center gap-3">
                <button type="button" aria-label="One fewer guest" onClick={() => setGuests((g) => Math.max(1, g - 1))} className="h-8 w-8 cursor-pointer rounded-full border border-neutral-300 text-neutral-950 transition hover:border-neutral-900">−</button>
                <span className="w-5 text-center font-mono text-neutral-950">{guests}</span>
                <button type="button" aria-label="One more guest" onClick={() => setGuests((g) => Math.min(20, g + 1))} className="h-8 w-8 cursor-pointer rounded-full border border-neutral-300 text-neutral-950 transition hover:border-neutral-900">+</button>
              </span>
            </div>
            <fieldset className="pt-1">
              <legend className={label}>When will you arrive?</legend>
              <div className="space-y-2">
                {arrivals.map((a) => (
                  <label key={a.id} className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 text-sm transition ${arrival === a.id ? 'border-neutral-900 ring-4 ring-neutral-900/5' : 'border-neutral-200 hover:border-neutral-400'}`}>
                    <span><span className="block font-medium text-neutral-950">{a.title}</span><span className="block text-xs text-neutral-500">{a.hint}</span></span>
                    <input type="radio" name="arrival" value={a.id} checked={arrival === a.id} onChange={() => setArrival(a.id)} className="h-4 w-4 accent-neutral-950" />
                  </label>
                ))}
              </div>
            </fieldset>
            <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} placeholder="Anything we should know? (optional)" rows={2} className={`${stayButton.input} h-auto py-3`} />
            {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
            <button type="submit" disabled={busy} className={`${stayButton.primary} w-full`}>{busy ? 'Reserving…' : 'Reserve for free'}</button>
            <p className="text-center text-[11px] text-neutral-400">Nothing is charged online. You pay {inr(type.price * nights)} at the front desk when you arrive.</p>
          </form>
        )}
      </div>
    </div>
  );
}

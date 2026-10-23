'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, Smartphone } from 'lucide-react';
import type { GuestAccountSummary } from '@/lib/guest/guest-account-client';
import { SPRING } from '@/components/guest/menu/motion';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import { inr, plural, shortDate, type StayType } from './stay-format';
import { stayButton } from './StayShell';
import { BookingConfirmed, type Confirmed } from './BookingConfirmed';
import { BookingArcHeader } from './booking/BookingArcHeader';
import { ArrivalChoice, GuestStepper } from './booking/BookingChoices';

interface Props { venueId: string; type: StayType; checkIn: string; checkOut: string; nights: number; account: GuestAccountSummary | null; onClose: () => void }

/**
 * Name, phone, guests and when they expect to arrive; confirmed at once, free, with a code to show at the desk. Opened
 * like a room or an event: the room's photo under a curved edge, the details below, the total and the button always in
 * reach. A guest signed in with a Vibers ID has the name filled in and the mobile taken from the account (the browser
 * only sees it masked; the server attaches the real one), unless they choose to give another number.
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
  const total = type.price * nights;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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

  const header = (kicker: string) => (
    <BookingArcHeader kicker={kicker} title={type.name} photo={type.photos[0] || null} onClose={onClose}
      detail={`${shortDate(checkIn)} → ${shortDate(checkOut)} · ${plural(nights, 'night')} · sleeps ${type.occupancy}`} />
  );

  return (
    <motion.div className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-[#08160f]/55" />
      <motion.div role="dialog" aria-modal="true" aria-label={`Reserve ${type.name}`} transition={SPRING} initial={{ y: 70, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="relative flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[30px] bg-[#fbf9f4] shadow-2xl sm:rounded-[30px]">
        {done ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{header('Reserved')}<div className="px-5 pb-6"><BookingConfirmed done={done} onClose={onClose} /></div></div>
        ) : (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {header('Reserve · free')}
              <div className="space-y-3 px-5 pb-5 pt-5">
                {account && (
                  <p className="inline-flex items-center gap-1.5 rounded-full border border-[#0f2a1e]/15 bg-[#eef3ee] px-3 py-1 text-[11px] font-medium text-[#173a2a]"><BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Reserving with your Vibers ID · {account.handle}</p>
                )}
                <input required minLength={2} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name" className={stayButton.input} autoComplete="name" />
                {askPhone ? (
                  <input required inputMode="numeric" pattern="[0-9]{10}" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile number" className={stayButton.input} autoComplete="tel" autoFocus={Boolean(account)} />
                ) : (
                  <div className="flex h-12 items-center justify-between gap-3 rounded-2xl border border-[#e8dfcc] bg-[#fbf9f4] px-4 text-sm">
                    <span className="inline-flex min-w-0 items-center gap-2 text-[#10231a]"><Smartphone className="h-4 w-4 shrink-0 text-[#8a6d3f]" aria-hidden /><span className="font-mono tracking-wider">{masked}</span><span className="truncate text-xs text-[#10231a]/45">from your Vibers ID</span></span>
                    <button type="button" onClick={() => setOwnPhone(true)} className="shrink-0 cursor-pointer text-xs font-semibold text-[#8a6d3f] underline-offset-2 hover:underline">Use another</button>
                  </div>
                )}
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className={stayButton.input} autoComplete="email" />
                <GuestStepper guests={guests} onChange={setGuests} />
                <ArrivalChoice arrivals={arrivals} value={arrival} onChange={setArrival} />
                <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} placeholder="Anything we should know? (optional)" rows={2} className={`${stayButton.input} h-auto py-3`} />
                {error && <p role="alert" className="rounded-xl border border-[#e7b4a8] bg-[#fbeeea] px-3 py-2 text-xs text-[#8a2d1c]">{error}</p>}
                <p className="text-center text-[11px] text-[#10231a]/45">Nothing is charged online. You pay at the front desk when you arrive.</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-4 border-t border-[#e8dfcc] bg-[#fbf9f4] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-3.5">
              <p className="leading-tight text-[#10231a]">
                <span className="text-[1.7rem] font-medium" style={LUXE_SERIF}>{inr(total)}</span>
                <span className="block text-[11px] text-[#10231a]/50">{plural(nights, 'night')} · paid at the desk</span>
              </p>
              <button type="submit" disabled={busy} className={stayButton.primary}>{busy ? 'Reserving…' : 'Reserve for free'}</button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

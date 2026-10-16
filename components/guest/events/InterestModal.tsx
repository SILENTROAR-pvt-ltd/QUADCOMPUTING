'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';
import { SPRING, press } from '@/components/guest/menu/motion';
import { checkParty, type PartyMix } from '@/lib/services/live-events/party';
import { eventDay, eventTime, type GuestEvent } from './event-format';
import { PartyPicker } from './PartyPicker';
import { useEventInterest } from './useEventInterest';

const FIELD = 'h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-[16px] text-zinc-900 placeholder:text-zinc-400 focus:border-[#0A3222] focus:outline-none';

/** The "I'm Interested" sheet: the guest's details come from their sign-in, they choose who is coming, and it is sent. */
export function InterestModal({ venueId, event, onClose, onDone }: { venueId: string; event: GuestEvent | null; onClose: () => void; onDone: (message: string) => void }) {
  return (
    <AnimatePresence>
      {event && (
        <motion.div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-black/45" />
          <motion.div role="dialog" aria-modal="true" aria-label={`I'm interested in ${event.title}`} transition={SPRING}
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-[#faf9f6] p-5 pb-8 shadow-2xl sm:rounded-[28px]">
            <InterestForm key={event.id} venueId={venueId} event={event} onClose={onClose} onDone={onDone} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InterestForm({ venueId, event, onClose, onDone }: { venueId: string; event: GuestEvent; onClose: () => void; onDone: (m: string) => void }) {
  const { prefill, ready, busy, error, submit } = useEventInterest(venueId, event.id);
  const [mix, setMix] = useState<PartyMix>({ male: 1, female: 0, other: 0 });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => { if (ready) { setName((n) => n || prefill.name); setEmail((e) => e || prefill.email || ''); } }, [ready, prefill]);

  const party = checkParty(mix);
  const needsContact = !prefill.signedIn && !phone.replace(/\D/g, '') && !email.trim();
  const canSend = ready && party.ok && name.trim().length >= 2 && !needsContact && !busy;

  const send = async () => {
    const out = await submit({ party: mix, name, phone, email });
    if (out) { setSent(out.message); onDone(out.message); }
  };

  if (sent) {
    return (
      <div className="space-y-4 py-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden />
        <p className="font-serif text-xl text-zinc-950">{sent}</p>
        <button type="button" onClick={onClose} className="h-12 w-full cursor-pointer rounded-full bg-[#0A3222] text-sm font-semibold text-white">Done</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-400">Guest list</p>
          <h2 className="mt-1 font-serif text-xl leading-tight text-zinc-950">{event.title}</h2>
          <p className="mt-0.5 text-xs text-zinc-500">{eventDay(event.starts_at)} · {eventTime(event.starts_at)}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-white text-zinc-500"><X className="h-4 w-4" /></button>
      </div>

      <div className="space-y-2">
        {prefill.signedIn && prefill.handle && (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-medium text-emerald-800">Signed in as {prefill.handle}</p>
        )}
        <input value={name} onChange={(e) => setName(e.target.value)} readOnly={prefill.signedIn} autoComplete="name" placeholder="Your name" aria-label="Your name" className={`${FIELD} ${prefill.signedIn ? 'bg-zinc-100' : ''}`} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} readOnly={prefill.signedIn && Boolean(prefill.email)} type="email" autoComplete="email" placeholder="Email" aria-label="Email" className={FIELD} />
        <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, '').slice(0, 16))} inputMode="tel" autoComplete="tel" placeholder="Phone (optional)" aria-label="Phone number" className={FIELD} />
        {needsContact && <p className="px-1 text-[11.5px] text-zinc-500">Add a phone number or email so the team can reach you.</p>}
      </div>

      <PartyPicker mix={mix} onChange={setMix} left={{ total: event.spots_left, male: event.spots_left_men, female: event.spots_left_women }} />

      {error && <p role="alert" className="text-sm font-medium text-rose-600">{error}</p>}
      <motion.button type="button" onClick={() => void send()} disabled={!canSend} {...press}
        className="h-13 w-full cursor-pointer rounded-full bg-[#0A3222] py-3.5 text-[15px] font-semibold text-white disabled:opacity-40">
        {busy ? 'Sending…' : "Put me on the guest list"}
      </motion.button>
    </div>
  );
}

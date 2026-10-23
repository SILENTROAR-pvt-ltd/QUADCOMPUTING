'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { SPRING, press } from '@/components/guest/menu/motion';
import { checkParty, type PartyMix } from '@/lib/services/live-events/party';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import { eventDay, eventTime, type GuestEvent } from './event-format';
import { PartyPicker } from './PartyPicker';
import { useEventInterest } from './useEventInterest';

const FIELD = 'h-12 w-full rounded-2xl border border-[#e8dfcc] bg-[#f8f4ea] px-4 text-[16px] text-[#10231a] placeholder:text-[#10231a]/40 focus:border-[#b08d57] focus:bg-white focus:outline-none focus:shadow-[0_0_0_3px_rgba(217,193,147,0.2)]';

/** The "I'm Interested" sheet: the guest's details come from their sign-in, they choose who is coming, and it is sent. */
export function InterestModal({ venueId, event, onClose, onDone }: { venueId: string; event: GuestEvent | null; onClose: () => void; onDone: (message: string) => void }) {
  return (
    <AnimatePresence>
      {event && (
        <motion.div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-[#08160f]/55" />
          <motion.div role="dialog" aria-modal="true" aria-label={`I'm interested in ${event.title}`} transition={SPRING}
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[30px] border-t border-[#e8dfcc] bg-[#fbf9f4] p-5 pb-8 shadow-2xl sm:rounded-[30px]">
            <span aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(217,193,147,0.32),transparent_68%)]" />
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
      <div className="relative space-y-4 py-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] text-[#d9c193] shadow-[0_0_0_4px_#fbf9f4,0_0_0_5px_rgba(176,141,87,0.5)]"><Check className="h-6 w-6" aria-hidden /></span>
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.28em] text-[#8a6d3f]">The guest list</p>
        <p className="text-[1.6rem] font-medium leading-tight text-[#10231a]" style={LUXE_SERIF}>{sent}</p>
        <p className="text-[12.5px] text-[#10231a]/60">We will let you know here the moment the venue confirms your place.</p>
        <button type="button" onClick={onClose} className="h-12 w-full cursor-pointer rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] text-sm font-semibold text-[#f5f1e8]">Wonderful</button>
      </div>
    );
  }

  return (
    <div className="relative space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.28em] text-[#8a6d3f]">The guest list</p>
          <h2 className="mt-1 text-[1.8rem] font-medium leading-[1.05] text-[#10231a]" style={LUXE_SERIF}>{event.title}</h2>
          <p className="mt-1 text-[12px] text-[#10231a]/55">{eventDay(event.starts_at)} · {eventTime(event.starts_at)}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-[#e8dfcc] bg-[#fbf9f4] text-[#10231a]/55"><X className="h-4 w-4" /></button>
      </div>
      <p className="text-[13px] leading-relaxed text-[#10231a]/70">We would love to have you. Tell us who is coming, and the team will confirm your place personally.</p>

      <div className="space-y-2">
        {prefill.signedIn && prefill.handle && (
          <p className="inline-flex items-center gap-1.5 rounded-full border border-[#d9c193] bg-[#fbf6e8] px-3 py-1 text-[12px] font-medium text-[#6f5631]">Joining as {prefill.handle}</p>
        )}
        <input value={name} onChange={(e) => setName(e.target.value)} readOnly={prefill.signedIn} autoComplete="name" placeholder="Your name" aria-label="Your name" className={`${FIELD} ${prefill.signedIn ? 'bg-[#efe7d6]' : ''}`} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} readOnly={prefill.signedIn && Boolean(prefill.email)} type="email" autoComplete="email" placeholder="Email" aria-label="Email" className={FIELD} />
        <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, '').slice(0, 16))} inputMode="tel" autoComplete="tel" placeholder="Phone (optional)" aria-label="Phone number" className={FIELD} />
        {needsContact && <p className="px-1 text-[11.5px] text-[#10231a]/55">A phone number or email, please, so the team can reach you.</p>}
      </div>

      <PartyPicker mix={mix} onChange={setMix} left={{ total: event.spots_left, male: event.spots_left_men, female: event.spots_left_women }} />

      {error && <p role="alert" className="text-sm font-medium text-rose-600">{error}</p>}
      <motion.button type="button" onClick={() => void send()} disabled={!canSend} {...press}
        className="w-full cursor-pointer rounded-full bg-gradient-to-br from-[#0f2a1e] via-[#143524] to-[#1d4632] py-3.5 text-[15px] font-semibold text-[#f5f1e8] shadow-[0_14px_28px_-14px_rgba(15,42,30,0.85)] ring-1 ring-[#d9c193]/35 disabled:opacity-40">
        {busy ? 'Sending your request…' : 'Request my place'}
      </motion.button>
      <p className="text-center text-[11px] text-[#10231a]/45">Nothing to pay now. The venue confirms, then you simply arrive.</p>
    </div>
  );
}

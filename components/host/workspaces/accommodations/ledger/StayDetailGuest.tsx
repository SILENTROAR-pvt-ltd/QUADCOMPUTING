'use client';

import React from 'react';
import { Mail, MapPin, Phone, ShieldCheck, Sparkles, Users } from 'lucide-react';
import type { HistoricalStayRecord } from '@/types';
import { guestId, plural, when } from './stay-format';

const CELL = 'rounded-2xl border border-neutral-200 bg-neutral-50/60 px-3.5 py-3';
const LABEL = 'block text-[10px] font-bold uppercase tracking-wider text-neutral-500';

/** Who stayed, as registered at the desk: contact, ID, and the stay's dates, party and purpose. */
export function StayDetailGuest({ stay }: { stay: HistoricalStayRecord }) {
  const id = guestId(stay);
  const addons = Array.isArray(stay.selected_addons) ? stay.selected_addons : [];
  return (
    <section className="space-y-3" aria-label="Guest">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className={CELL}>
          <span className={LABEL}>Phone</span>
          {stay.guest_phone ? <a href={`tel:${stay.guest_phone}`} className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-sm text-neutral-900 hover:underline"><Phone className="h-3.5 w-3.5 text-neutral-400" aria-hidden />{stay.guest_phone}</a> : <span className="mt-0.5 block text-sm text-neutral-500">Not recorded</span>}
        </div>
        <div className={CELL}>
          <span className={LABEL}>ID proof</span>
          {id.number || id.type
            ? <span className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-neutral-900"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden />{id.type}{id.number ? <span className="font-mono"> · {id.number}</span> : null}</span>
            : <span className="mt-0.5 block text-sm text-neutral-500">Not recorded</span>}
        </div>
        {stay.guest_email && <div className={CELL}><span className={LABEL}>Email</span><span className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-neutral-900"><Mail className="h-3.5 w-3.5 text-neutral-400" aria-hidden />{stay.guest_email}</span></div>}
        {stay.guest_address && <div className={CELL}><span className={LABEL}>Address</span><span className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-neutral-900"><MapPin className="h-3.5 w-3.5 text-neutral-400" aria-hidden />{stay.guest_address}</span></div>}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className={CELL}><span className={LABEL}>Checked in</span><span className="mt-0.5 block text-sm text-neutral-900">{when(stay.check_in_time)}</span></div>
        <div className={CELL}><span className={LABEL}>Checked out</span><span className="mt-0.5 block text-sm text-neutral-900">{stay.check_out_time ? when(stay.check_out_time) : 'In house'}</span></div>
        <div className={CELL}><span className={LABEL}>Party</span><span className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-neutral-900"><Users className="h-3.5 w-3.5 text-neutral-400" aria-hidden />{plural(stay.total_guests || 1, 'guest')} · {plural(stay.nights || 1, 'night')}</span></div>
        <div className={CELL}><span className={LABEL}>Purpose</span><span className="mt-0.5 block truncate text-sm text-neutral-900">{stay.purpose_of_visit || 'Leisure'}</span></div>
      </div>

      {stay.is_celebration && (
        <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          <span><strong>{stay.celebration_type || 'Celebration'}</strong>{stay.celebration_note ? ` · “${stay.celebration_note}”` : ''}</span>
        </p>
      )}
      {addons.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {addons.map((a) => <span key={a.id || a.name} className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-800">{a.name} <span className="font-mono text-neutral-500">₹{a.price}</span></span>)}
        </div>
      )}
    </section>
  );
}

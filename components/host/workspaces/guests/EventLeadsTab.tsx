'use client';

import React, { useEffect, useState } from 'react';
import { Download, MessageCircle, RefreshCw } from 'lucide-react';
import { useHostEvents } from './useHostEvents';
import { useEventLeads, type EventLead } from './useEventLeads';

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });

/** A message the owner can send by WhatsApp (or email), already written; nothing is sent from here on their behalf. */
function reachLink(lead: EventLead, eventTitle: string): string | null {
  const text = `Hi ${lead.guest_name.split(' ')[0]}, thanks for your interest in ${eventTitle}. We have a special offer for you. See you soon!`;
  const phone = (lead.phone || '').replace(/\D/g, '');
  if (phone.length >= 10) return `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(text)}`;
  return lead.email ? `mailto:${lead.email}?subject=${encodeURIComponent(eventTitle)}&body=${encodeURIComponent(text)}` : null;
}

/** Tab 2: pick an event and see everyone who said "I'm Interested". */
export function EventLeadsTab() {
  const { events } = useHostEvents();
  const [eventId, setEventId] = useState<string | null>(null);
  const { leads, loading, error, reload, setStatus } = useEventLeads(eventId);
  const chosen = events.find((e) => e.id === eventId);

  useEffect(() => { if (!eventId && events[0]) setEventId(events[0].id); }, [events, eventId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={eventId ?? ''} onChange={(e) => setEventId(e.target.value || null)} aria-label="Event" disabled={events.length === 0}
          className="h-11 min-w-0 flex-1 cursor-pointer rounded-xl border border-neutral-200 bg-white px-3 text-[16px]">
          {events.length === 0 && <option value="">No events yet</option>}
          {events.map((e) => <option key={e.id} value={e.id}>{e.title} · {new Date(e.starts_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</option>)}
        </select>
        <button type="button" onClick={() => void reload()} aria-label="Refresh" className="grid h-11 w-11 cursor-pointer place-items-center rounded-xl border border-neutral-200 bg-white"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
        {eventId && (
          <a href={`/api/host/live-events/leads?event_id=${encodeURIComponent(eventId)}&format=csv`} className="inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold">
            <Download className="h-4 w-4" aria-hidden /> Export CSV
          </a>
        )}
      </div>

      {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}

      <ul className="space-y-2">
        {!loading && leads.length === 0 && <li className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-10 text-center text-sm text-neutral-500">No one has joined this list yet.</li>}
        {leads.map((l) => {
          const link = chosen ? reachLink(l, chosen.title) : null;
          return (
            <li key={l.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-950">{l.guest_name} {l.vibers_handle && <span className="ml-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">{l.vibers_handle}</span>}</p>
                  <p className="text-xs text-neutral-600">{[l.email, l.phone].filter(Boolean).join(' · ') || 'No contact'}</p>
                  <p className="mt-1 text-xs text-neutral-600">Party of <b>{l.party_size}</b> ({l.party_male} men, {l.party_female} women{l.party_other ? `, ${l.party_other} other` : ''}) · {when(l.created_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${l.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-800' : l.status === 'DECLINED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>{l.status === 'CONFIRMED' ? 'Confirmed' : l.status === 'DECLINED' ? 'Declined' : 'Interested'}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {l.status !== 'CONFIRMED' && <button type="button" onClick={() => void setStatus(l.id, 'CONFIRMED')} className="h-10 cursor-pointer rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white">Mark Confirmed</button>}
                {l.status !== 'DECLINED' && <button type="button" onClick={() => void setStatus(l.id, 'DECLINED')} className="h-10 cursor-pointer rounded-lg border border-neutral-200 px-3 text-xs font-semibold text-neutral-700">Decline</button>}
                {link && <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-semibold text-neutral-700"><MessageCircle className="h-3.5 w-3.5" aria-hidden /> Send alert / discount</a>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

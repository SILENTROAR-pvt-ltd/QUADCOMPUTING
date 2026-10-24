'use client';

import React, { useEffect, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { apiRequest } from '@/lib/utils/api-client';
import { EventForm } from './EventForm';
import { useHostEvents, type HostEvent } from './useHostEvents';
import { usePlanFeatures } from '@/components/host/plan/usePlanFeatures';
import { PlanLockedCard } from '@/components/host/plan/PlanLockedCard';

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
const BADGE: Record<HostEvent['status'], string> = { LIVE: 'bg-emerald-50 text-emerald-800', DRAFT: 'bg-neutral-100 text-neutral-600', CANCELLED: 'bg-rose-50 text-rose-700' };

/** Tab 3: publish and manage the venue's live events; guests see the live ones in the lounge and on the menu. */
export function LiveEventsManager() {
  const h = useHostEvents();
  // Without events on the plan the list stays (to hide, cancel or delete), but nothing new is published.
  const onPlan = usePlanFeatures().has('events');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legacy, setLegacy] = useState(0);
  const act = async (p: Promise<string | null>) => { setError(await p); };

  // Moments the venue posted the old way: one tap turns them into live events (and takes the old ones down).
  useEffect(() => { void apiRequest<{ count: number }>('/api/host/live-events/import', { cache: 'no-store' }).then((r) => setLegacy(r.ok ? r.data?.count ?? 0 : 0)); }, [h.events.length]);
  const importLegacy = async () => {
    const r = await apiRequest('/api/host/live-events/import', { method: 'POST' });
    if (!r.ok) setError(r.error || 'Could not import the moments.'); else { setLegacy(0); await h.reload(); }
  };

  return (
    <div className="space-y-4">
      {!onPlan && <PlanLockedCard feature="events" />}
      {onPlan && !adding && (
        <button type="button" onClick={() => setAdding(true)} className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white">
          <CalendarPlus className="h-4 w-4" aria-hidden /> New live event
        </button>
      )}
      {onPlan && legacy > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">You have {legacy} older {legacy === 1 ? 'moment' : 'moments'} that guests still see as photos. Turn {legacy === 1 ? 'it' : 'them'} into live events with a guest list.</p>
          <button type="button" onClick={() => void importLegacy()} className="h-10 cursor-pointer rounded-lg bg-amber-900 px-4 text-xs font-semibold text-white">Turn into live events</button>
        </div>
      )}
      {adding && <EventForm onPublish={h.publish} onCancel={() => setAdding(false)} />}
      {(error || h.error) && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error || h.error}</p>}

      <ul className="space-y-2">
        {h.loading ? <li className="shimmer h-20 rounded-2xl" /> : h.events.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-10 text-center text-sm text-neutral-500">No events yet. Publish one and guests can join its list from the lounge.</li>
        ) : h.events.map((e) => (
          <li key={e.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-950">{e.title}</p>
                <p className="text-xs text-neutral-500">{when(e.starts_at)} · {e.category} · {e.entry_fee > 0 ? `₹${e.entry_fee}` : 'Free'}</p>
                <p className="mt-1 text-xs text-neutral-600">{e.interested_parties} {e.interested_parties === 1 ? 'party' : 'parties'} interested · {e.seats_booked} guests{e.capacity ? ` of ${e.capacity}` : ''}
                  {e.male_capacity !== null && e.female_capacity !== null && ` (men ${e.men_booked}/${e.male_capacity}, women ${e.women_booked}/${e.female_capacity})`}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${BADGE[e.status]}`}>{e.status === 'LIVE' ? 'Live' : e.status === 'DRAFT' ? 'Draft' : 'Cancelled'}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {onPlan && e.status !== 'LIVE' && <button type="button" onClick={() => void act(h.setStatus(e.id, 'LIVE'))} className="h-10 cursor-pointer rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white">Make live</button>}
              {e.status === 'LIVE' && <button type="button" onClick={() => void act(h.setStatus(e.id, 'DRAFT'))} className="h-10 cursor-pointer rounded-lg border border-neutral-200 px-3 text-xs font-semibold text-neutral-700">Hide from guests</button>}
              {e.status !== 'CANCELLED' && <button type="button" onClick={() => void act(h.setStatus(e.id, 'CANCELLED'))} className="h-10 cursor-pointer rounded-lg border border-neutral-200 px-3 text-xs font-semibold text-neutral-700">Cancel event</button>}
              <button type="button" onClick={() => { if (window.confirm(`Delete "${e.title}" and its guest list?`)) void act(h.remove(e.id)); }} className="h-10 cursor-pointer rounded-lg border border-neutral-200 px-3 text-xs font-semibold text-rose-700">Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

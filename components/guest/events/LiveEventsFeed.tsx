'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { EventCard } from './EventCard';
import { InterestModal } from './InterestModal';
import { useLiveEvents } from './useLiveEvents';
import { useMyEventStatus } from './useMyEventStatus';
import type { GuestEvent } from './event-format';

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

interface LiveEventsFeedProps {
  venueId?: string;
  /** "rail" is one swipeable row (for the menu); "grid" is the lounge's full list. */
  layout?: 'grid' | 'rail';
  /** Draws nothing until the venue has an event, instead of an empty-state card. */
  hideWhenEmpty?: boolean;
}

/** The venue's live events, with "I'm Interested" on each. Replaces the old photo "Moments" in the lounge and on the menu. */
export function LiveEventsFeed({ venueId = '', layout = 'grid', hideWhenEmpty = false }: LiveEventsFeedProps) {
  const { events, loading, refreshing, refresh } = useLiveEvents(venueId);
  // The guest's own requests and the venue's answers (waiting, going, declined), shown on each card.
  const mine = useMyEventStatus(venueId);
  const [chosen, setChosen] = useState<GuestEvent | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); }, [toast]);

  if (hideWhenEmpty && (loading || events.length === 0)) return null;
  const rail = layout === 'rail';

  return (
    <section aria-label="Live events" className={rail ? 'space-y-3.5 border-t border-zinc-200/80 pt-8' : 'space-y-3.5'}>
      <div className="flex items-start justify-between gap-3 px-0.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-zinc-400">At the venue</p>
          <h2 className="mt-1 text-[21px] leading-tight text-zinc-950" style={SERIF}>Live Events</h2>
          <p className="mt-1.5 text-[12px] leading-snug text-zinc-500">Tap I&apos;m Interested to join the guest list.</p>
        </div>
        {!rail && (
          <button type="button" onClick={() => void refresh()} disabled={refreshing} aria-label="Refresh events"
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-zinc-200/70 bg-white text-zinc-500 active:scale-95">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-busy="true">{[1, 2].map((n) => <div key={n} className="shimmer h-72 rounded-3xl" />)}</div>
      ) : events.length === 0 ? (
        <div className="space-y-2 rounded-2xl border border-neutral-200/80 bg-white px-6 py-12 text-center">
          <p className="text-lg text-zinc-950" style={SERIF}>No events right now</p>
          <p className="text-xs text-zinc-500">When the venue plans a night, it shows up here.</p>
        </div>
      ) : rail ? (
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6">
          {events.map((e) => <div key={e.id} className="w-[84%] max-w-[340px] shrink-0 snap-start"><EventCard event={e} mine={mine.statuses[e.id]} onInterested={setChosen} /></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{events.map((e) => <EventCard key={e.id} event={e} mine={mine.statuses[e.id]} onInterested={setChosen} />)}</div>
      )}

      <InterestModal venueId={venueId} event={chosen} onClose={() => setChosen(null)} onDone={(m) => { setToast(m); void refresh(); void mine.reload(); }} />
      {toast && <div role="status" className="fixed inset-x-4 bottom-24 z-[100] mx-auto max-w-sm rounded-2xl bg-[#0A3222] px-4 py-3 text-center text-sm font-medium text-white shadow-xl">{toast}</div>}
    </section>
  );
}

export default LiveEventsFeed;

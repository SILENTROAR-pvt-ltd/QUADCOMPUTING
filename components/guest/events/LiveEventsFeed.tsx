'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { EventCard } from './EventCard';
import { InterestModal } from './InterestModal';
import { EventDetailSheet } from './EventDetailSheet';
import { useLiveEvents } from './useLiveEvents';
import { useMyEventStatus } from './useMyEventStatus';
import type { GuestEvent } from './event-format';
import s from '@/components/guest/luxe/luxe-guest.module.css';

const SERIF = { fontFamily: "var(--font-luxe), 'Playfair Display', Georgia, serif" } as const;
const rise = (i: number) => ({ ['--i' as string]: i }) as React.CSSProperties;

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
  const [viewing, setViewing] = useState<GuestEvent | null>(null);
  // From the detail sheet, "I'm Interested" closes it and opens the form.
  const interested = (e: GuestEvent) => { setViewing(null); setChosen(e); };
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); }, [toast]);

  if (hideWhenEmpty && (loading || events.length === 0)) return null;
  const rail = layout === 'rail';

  return (
    <section aria-label="Live events" className={rail ? 'space-y-4 border-t border-[#e8dfcc] pt-8' : 'space-y-4'}>
      <div className="flex items-start justify-between gap-3 px-0.5">
        <div>
          <p className="flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8a6d3f] before:h-px before:w-6 before:bg-[#b08d57]">At the venue</p>
          <h2 className="mt-2 text-[2rem] font-light leading-[1.05] text-[#10231a]" style={SERIF}>Live <em className="font-normal text-[#8a6d3f]">events</em></h2>
          <p className="mt-1.5 text-[12.5px] leading-snug text-[#10231a]/60">Tap I&apos;m Interested to join the guest list.</p>
        </div>
        {!rail && (
          <button type="button" onClick={() => void refresh()} disabled={refreshing} aria-label="Refresh events"
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-[#e8dfcc] bg-[#fbf9f4] text-[#8a6d3f] active:scale-95">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-busy="true">{[1, 2].map((n) => <div key={n} className="shimmer h-80 rounded-[26px]" />)}</div>
      ) : events.length === 0 ? (
        <div className="space-y-2 rounded-[24px] border border-dashed border-[#d9c193] bg-[#fbf9f4] px-6 py-12 text-center">
          <p className="text-[1.4rem] text-[#10231a]" style={SERIF}>No events right now</p>
          <p className="text-xs text-[#10231a]/55">When the venue plans a night, it shows up here.</p>
        </div>
      ) : rail ? (
        <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:scroll-px-6 sm:px-6">
          {events.map((e) => <div key={e.id} className="w-[84%] max-w-[340px] shrink-0 snap-start"><EventCard event={e} mine={mine.statuses[e.id]} onInterested={setChosen} onOpen={setViewing} /></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {events.map((e, i) => <div key={e.id} className={s.riseIn} style={rise(i)}><EventCard event={e} mine={mine.statuses[e.id]} onInterested={setChosen} onOpen={setViewing} /></div>)}
        </div>
      )}

      <EventDetailSheet event={viewing} mine={viewing ? mine.statuses[viewing.id] : undefined} onClose={() => setViewing(null)} onInterested={interested} />
      <InterestModal venueId={venueId} event={chosen} onClose={() => setChosen(null)} onDone={(m) => { setToast(m); void refresh(); void mine.reload(); }} />
      {toast && <div role="status" className="fixed inset-x-4 bottom-24 z-[100] mx-auto max-w-sm rounded-full bg-[#0f2a1e] px-4 py-3 text-center text-sm font-medium text-[#f5f1e8] shadow-xl ring-1 ring-[#d9c193]/30">{toast}</div>}
    </section>
  );
}

export default LiveEventsFeed;

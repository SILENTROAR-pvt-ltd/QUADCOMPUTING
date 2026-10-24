'use client';

import React, { useReducer } from 'react';
import { Building2, Hand, RotateCcw, Smartphone } from 'lucide-react';
import { Reveal } from '@/components/vibers/Reveal';
import { DISPLAY } from '@/components/vibers/vibers-fonts';
import { CONTAINER, H2, KICKER, LEAD, SECTION, TURN } from '../qc-brand';
import { NEXT_HINT, START_PLAY, playReducer } from './play-state';
import { PlayPhone } from './PlayPhone';
import { PlayVenue } from './PlayVenue';
import s from '@/components/vibers/luxe.module.css';

/**
 * "Your turn": the visitor runs one table themselves, ordering as the guest, cooking and settling as the venue, while the
 * day's numbers move. A line above always says what to do next, and the next control glows on whichever side it lives.
 */
export function PlaySection() {
  const [state, dispatch] = useReducer(playReducer, START_PLAY);
  const hint = NEXT_HINT[state.stage];

  return (
    <section id="play" aria-labelledby="play-title" className={`${SECTION} bg-[#ece6d8] text-[#0c0f0d]`}>
      <div className={CONTAINER}>
        <div className="max-w-2xl">
          <Reveal><p className={KICKER}>Your turn</p></Reveal>
          <Reveal index={1}><h2 id="play-title" className={`${DISPLAY} ${H2}`}>Run a table <em className={TURN}>yourself.</em></h2></Reveal>
          <Reveal index={2}><p className={`${LEAD} mt-6`}>Order as the guest, then cook and settle as the venue. Thirty seconds, and you will know how a Saturday feels on Quad Computing.</p></Reveal>
        </div>

        <Reveal index={1}>
          <div className="mt-12 rounded-[28px] bg-[#0c0f0d] p-4 sm:p-8">
            <p key={state.stage} aria-live="polite" className={`${s.fadeUp} mb-6 flex items-start gap-3 rounded-2xl border border-[#d9c193]/30 bg-[#d9c193]/10 px-4 py-3 text-[14px] leading-relaxed text-[#f6f3ec]`}>
              <Hand aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#d9c193]" />
              <span><b className="mr-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d9c193]">{hint.side === 'guest' ? 'Guest' : 'Venue'}</b>{hint.text}</span>
            </p>
            <div className="grid items-start gap-8 lg:grid-cols-[auto_1fr] lg:gap-10">
              <div className="flex flex-col items-center">
                <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#d9c193]"><Smartphone aria-hidden="true" className="h-3.5 w-3.5" /> The guest’s phone</p>
                <PlayPhone state={state} dispatch={dispatch} turn={hint.side === 'guest'} />
              </div>
              <div>
                <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#f6f3ec]/60"><Building2 aria-hidden="true" className="h-3.5 w-3.5" /> Your control centre</p>
                <PlayVenue state={state} dispatch={dispatch} turn={hint.side === 'venue'} />
                {state.day.bills > 0 && (
                  <p className="mt-4 flex items-center gap-2 text-[12.5px] text-[#f6f3ec]/60">
                    <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> {state.day.bills} {state.day.bills === 1 ? 'table' : 'tables'} served. On ₹3 a bill, that cost you ₹{state.day.fees}; on a yearly plan, nothing.
                  </p>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

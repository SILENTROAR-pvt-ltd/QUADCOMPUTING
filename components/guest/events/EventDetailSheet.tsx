'use client';

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Clock, Sparkles, Ticket, Users, X } from 'lucide-react';
import { SPRING, press } from '@/components/guest/menu/motion';
import type { MyEventStatus } from '@/lib/services/live-events/my-event-status';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import s from '@/components/guest/luxe/luxe-guest.module.css';
import { eventDay, eventTime, feeLabel, isFull, spotsLabel, type GuestEvent } from './event-format';
import { EventRequestBadge, requestButtonLabel } from './EventRequestBadge';

interface Props { event: GuestEvent | null; mine?: MyEventStatus; onClose: () => void; onInterested: (e: GuestEvent) => void }

const CHIP = 'inline-flex items-center gap-1.5 rounded-full border border-[#e8dfcc] bg-[#fbf9f4] px-3 py-1.5 text-[12px] font-medium text-[#10231a]/80';

/**
 * An event, opened like a room on the stay page: the banner drifting under a curved edge with the title over it, what is
 * included, a few words about the evening, the details at a glance, and the entry with "I'm Interested" always in reach.
 */
export function EventDetailSheet({ event, mine, onClose, onInterested }: Props) {
  useEffect(() => {
    if (!event) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [event, onClose]);

  return (
    <AnimatePresence>
      {event && (
        <motion.div className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-[#08160f]/55" />
          <motion.div role="dialog" aria-modal="true" aria-labelledby="event-detail-title" transition={SPRING}
            initial={{ y: 70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 70, opacity: 0 }}
            className="relative flex max-h-[94dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[30px] bg-[#fbf9f4] shadow-2xl sm:rounded-[30px]">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="relative aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#1d4632,#0f2a1e)] [border-radius:0_0_50%_50%/0_0_12%_12%]">
                {event.banner_url && (
                  // eslint-disable-next-line @next/next/no-img-element -- the venue's own event banner
                  <img src={event.banner_url} alt="" className={`${s.slowmo} h-full w-full object-cover`} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,22,15,0.45)_0%,transparent_35%,rgba(8,22,15,0.88)_100%)]" />
                <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-[#f5f1e8]/90 text-[#0f2a1e]"><X className="h-4 w-4" /></button>
                <div className="absolute inset-x-0 bottom-0 px-5 pb-8 text-[#f5f1e8]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#d9c193]">{event.category}{event.is_live_now ? ' · live now' : ''}</p>
                  <h2 id="event-detail-title" className="mt-1.5 text-[2.1rem] font-medium leading-[1.02] [text-wrap:balance]" style={LUXE_SERIF}>{event.title}</h2>
                </div>
              </div>

              <div className="space-y-5 px-5 pb-6 pt-5">
                <div className="flex flex-wrap gap-1.5">
                  <span className={CHIP}><CalendarDays className="h-3.5 w-3.5 text-[#8a6d3f]" aria-hidden />{eventDay(event.starts_at)}</span>
                  <span className={CHIP}><Clock className="h-3.5 w-3.5 text-[#8a6d3f]" aria-hidden />{eventTime(event.starts_at)}</span>
                  <span className={CHIP}><Ticket className="h-3.5 w-3.5 text-[#8a6d3f]" aria-hidden />{feeLabel(event.entry_fee)}</span>
                  {spotsLabel(event) && <span className={CHIP}><Users className="h-3.5 w-3.5 text-[#8a6d3f]" aria-hidden />{spotsLabel(event)}</span>}
                </div>

                {event.perks.length > 0 && (
                  <div>
                    <h3 className="text-[1.35rem] font-medium text-[#10231a]" style={LUXE_SERIF}>What&apos;s included</h3>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {event.perks.map((p) => <li key={p} className="inline-flex items-center gap-1.5 rounded-full border border-[#d9c193] bg-[#fbf6e8] px-3 py-1.5 text-[12px] font-medium text-[#6f5631]"><Sparkles className="h-3 w-3" aria-hidden />{p}</li>)}
                    </ul>
                  </div>
                )}

                {event.description && (
                  <div>
                    <h3 className="text-[1.35rem] font-medium text-[#10231a]" style={LUXE_SERIF}>About the evening</h3>
                    <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed text-[#10231a]/70">{event.description}</p>
                  </div>
                )}

                {mine && <EventRequestBadge mine={mine} />}
              </div>
            </div>

            <EventDetailFooter event={event} mine={mine} onInterested={onInterested} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function EventDetailFooter({ event, mine, onInterested }: { event: GuestEvent; mine?: MyEventStatus; onInterested: (e: GuestEvent) => void }) {
  const full = isFull(event);
  const label = requestButtonLabel(mine, full);
  const blocked = full && (!mine || mine.status === 'DECLINED');
  return (
    <div className="flex shrink-0 items-center justify-between gap-4 border-t border-[#e8dfcc] bg-[#fbf9f4] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-3.5">
      <p className="leading-tight text-[#10231a]">
        <span className="text-[1.7rem] font-medium" style={LUXE_SERIF}>{event.entry_fee > 0 ? `₹${event.entry_fee.toLocaleString('en-IN')}` : 'Free'}</span>
        <span className="ml-1 text-[12px] text-[#10231a]/55">{event.entry_fee > 0 ? '/ guest' : 'entry'}</span>
      </p>
      {label ? (
        <motion.button type="button" disabled={blocked} onClick={() => onInterested(event)} {...press}
          className="h-12 cursor-pointer rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] px-6 text-[13.5px] font-semibold text-[#f5f1e8] shadow-[0_12px_24px_-12px_rgba(15,42,30,0.85)] ring-1 ring-[#d9c193]/35 disabled:cursor-not-allowed disabled:opacity-40">
          {label}
        </motion.button>
      ) : (
        <span className="rounded-full border border-[#0f2a1e]/20 bg-[#eef3ee] px-4 py-2 text-[12.5px] font-semibold text-[#173a2a]">You&apos;re on the list</span>
      )}
    </div>
  );
}

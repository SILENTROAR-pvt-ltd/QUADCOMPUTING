'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Sparkles, Ticket, Users } from 'lucide-react';
import { pressSoft, press } from '@/components/guest/menu/motion';
import { eventDay, eventTime, feeLabel, isFull, spotsLabel, type GuestEvent } from './event-format';
import type { MyEventStatus } from '@/lib/services/live-events/my-event-status';
import { EventRequestBadge, requestButtonLabel } from './EventRequestBadge';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import s from '@/components/guest/luxe/luxe-guest.module.css';

/**
 * One live event as an invitation, set like the stay page's rooms: the banner drifting under a curved edge with the date
 * above and the title centred over it, a line about the evening, what it costs and how many places are left, what is
 * included in one quiet line, and "I'm Interested" across the foot. Once the guest has asked, the card shows the
 * venue's answer (`mine`): waiting, "You're going", or not this time.
 */
export function EventCard({ event, mine, onInterested, onOpen }: { event: GuestEvent; mine?: MyEventStatus; onInterested: (e: GuestEvent) => void; onOpen?: (e: GuestEvent) => void }) {
  const spots = spotsLabel(event);
  const full = isFull(event);
  const label = requestButtonLabel(mine, full);
  // A guest already waiting or declined may still change or repeat their request even when the event looks full.
  const blocked = full && (!mine || mine.status === 'DECLINED');

  return (
    <motion.article {...pressSoft} onClick={onOpen ? () => onOpen(event) : undefined}
      className={`flex h-full flex-col overflow-hidden rounded-[30px] border border-[#e8dfcc] bg-[#fbf9f4] shadow-[0_26px_50px_-34px_rgba(15,42,30,0.6)] ${onOpen ? 'cursor-pointer' : ''}`}>
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#1d4632,#0f2a1e)] [border-radius:0_0_50%_50%/0_0_12%_12%]">
        {event.banner_url && (
          // A banner link that does not load (a typed address that is not an image) leaves the green panel, not a broken icon.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.banner_url} alt="" loading="lazy" className={`${s.slowmo} h-full w-full object-cover`}
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,22,15,0.4)_0%,transparent_30%,rgba(8,22,15,0.9)_100%)]" />
        <span className="absolute left-1/2 top-3.5 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#f5f1e8]/95 px-3 py-1 text-[11px] font-semibold text-[#10231a] shadow-sm">
          <CalendarDays className="h-3.5 w-3.5 text-[#8a6d3f]" aria-hidden /> {eventDay(event.starts_at)} · {eventTime(event.starts_at)}
        </span>
        {event.is_live_now && (
          <span className="absolute right-3 top-12 inline-flex items-center gap-1.5 rounded-full bg-[#0f2a1e]/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#d9c193]">
            <span aria-hidden className={`${s.pulse} h-1.5 w-1.5 rounded-full bg-[#d9c193]`} /> Live now
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 px-5 pb-8 text-center text-[#f5f1e8]">
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.28em] text-[#d9c193]">{event.category}</span>
          <h3 className="mt-1 line-clamp-2 text-[1.7rem] font-medium leading-[1.04] [text-wrap:balance]" style={LUXE_SERIF}>{event.title}</h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-3 text-center">
        {event.description && <p className="line-clamp-2 text-[13px] leading-relaxed text-[#10231a]/65">{event.description}</p>}

        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[12px] font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0f2a1e] px-3 py-1 text-[#f5f1e8]"><Ticket className="h-3.5 w-3.5 text-[#d9c193]" aria-hidden /> {feeLabel(event.entry_fee)}</span>
          {spots && (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${full ? 'border-[#e7b4a8] bg-[#fbeeea] text-[#8a2d1c]' : 'border-[#e8dfcc] bg-[#f8f4ea] text-[#10231a]/75'}`}>
              <Users className="h-3.5 w-3.5" aria-hidden /> {spots}
            </span>
          )}
        </div>

        {event.perks.length > 0 && (
          <p className="mt-2.5 line-clamp-1 text-[12px] italic text-[#8a6d3f]" style={LUXE_SERIF}>
            <Sparkles className="mr-1 inline h-3 w-3 align-[-1px] not-italic" aria-hidden />{event.perks.join(' · ')}
          </p>
        )}

        {mine && <div className="mt-3 text-left"><EventRequestBadge mine={mine} /></div>}

        {/* The button sits at the foot, so cards of different lengths line up in the row. */}
        {label && (
          <div className="mt-auto pt-4">
            <motion.button type="button" disabled={blocked} onClick={(e) => { e.stopPropagation(); onInterested(event); }} {...press}
              className={`h-12 w-full cursor-pointer rounded-full text-[13.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                mine?.status === 'INTERESTED'
                  ? 'border border-[#d9c193] bg-[#fbf9f4] text-[#10231a]'
                  : 'bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] text-[#f5f1e8] shadow-[0_10px_20px_-10px_rgba(15,42,30,0.85)] ring-1 ring-[#d9c193]/30'
              }`}>
              {label}
            </motion.button>
          </div>
        )}
      </div>
    </motion.article>
  );
}

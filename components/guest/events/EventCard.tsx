'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Sparkles, Ticket } from 'lucide-react';
import { pressSoft, press } from '@/components/guest/menu/motion';
import { eventDay, eventTime, feeLabel, isFull, spotsLabel, type GuestEvent } from './event-format';

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

/** One live event: banner, when, what it costs, what the guest gets, and a clear "I'm Interested". */
export function EventCard({ event, onInterested }: { event: GuestEvent; onInterested: (e: GuestEvent) => void }) {
  const spots = spotsLabel(event);
  const full = isFull(event);

  return (
    <motion.article {...pressSoft} className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-[0_10px_30px_-18px_rgba(10,50,34,0.45)]">
      <div className="relative h-44 w-full bg-[#0A3222]">
        {event.banner_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.banner_url} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-zinc-900">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden /> {eventDay(event.starts_at)} · {eventTime(event.starts_at)}
        </span>
        {event.is_live_now && <span className="absolute right-3 top-3 rounded-full bg-lime-300 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0A3222]">Live now</span>}
        <span className="absolute bottom-3 left-3 rounded-full bg-[#0A3222]/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">{event.category}</span>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="text-[19px] leading-tight text-zinc-950" style={SERIF}>{event.title}</h3>
          {event.description && <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-zinc-500">{event.description}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-medium">
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700"><Ticket className="h-3.5 w-3.5" aria-hidden /> {feeLabel(event.entry_fee)}</span>
          {event.perks.map((p) => <span key={p} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800"><Sparkles className="h-3 w-3" aria-hidden /> {p}</span>)}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className={`text-[11.5px] font-medium ${full ? 'text-rose-600' : 'text-zinc-500'}`}>{spots}</span>
          <motion.button type="button" disabled={full} onClick={() => onInterested(event)} {...press}
            className="ml-auto h-11 cursor-pointer rounded-full bg-[#0A3222] px-5 text-[13px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(10,50,34,0.9)] disabled:cursor-not-allowed disabled:opacity-40">
            {full ? 'Fully booked' : "I'm Interested"}
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}

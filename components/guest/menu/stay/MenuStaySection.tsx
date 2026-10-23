'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useStayHub } from '@/components/guest/stay/useStayHub';
import { useStayShowcase } from '@/components/stay/useStayShowcase';
import type { MenuItem } from '../types';
import { LuxeReveal } from '@/components/guest/luxe/LuxeReveal';
import { LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import { RoomShowcaseCard, type RoomCardData } from './RoomShowcaseCard';

/** A catalogue service that is a place to sleep (a room, a suite, a cottage), shown here rather than with the other services. */
export function isAccommodation(item: MenuItem): boolean {
  const t = (item.type || item.item_type || '').toLowerCase();
  if (t === 'accommodation' || t === 'room') return true;
  return /\b(room|rooms|suite|stay|accommodation|cottage|villa|dorm|tent|glamp)/i.test(`${item.category || ''}`);
}

/**
 * Accommodation, after the menu: a small, quiet heading and the venue's rooms as tall photographs to swipe through. Real
 * room types from the stay showcase when the venue takes stays (a card opens its stay page at that room); otherwise the
 * rooms in its catalogue.
 */
export function MenuStaySection({ venueId, venueName, services, onSelectService }: {
  venueId: string; venueName: string; services: MenuItem[]; onSelectService: (item: MenuItem) => void;
}) {
  const router = useRouter();
  const { data: hub } = useStayHub(venueId);
  const venueParam = hub?.venue.has_rooms ? hub.venue.slug || hub.venue.id : '';
  const showcase = useStayShowcase(venueParam);
  const stayHref = venueParam ? `/stay/${encodeURIComponent(venueParam)}` : null;
  const catalogRooms = services.filter(isAccommodation);

  const rooms: Array<RoomCardData & { open: () => void }> = stayHref && showcase.types.length
    ? showcase.types.map((t) => ({
        id: t.id, name: t.name, photos: t.photos, price: t.price, sleeps: t.occupancy,
        free: t.available_for_dates ?? t.vacant_now, perks: t.amenities, open: () => router.push(`${stayHref}#room-${t.id}`),
      }))
    : catalogRooms.map((i) => ({ id: String(i.id), name: i.name, photos: i.image_url ? [i.image_url] : [], price: Number(i.price) || null, open: () => onSelectService(i) }));
  if (rooms.length === 0) return null;

  return (
    <section aria-labelledby="menu-stay-title" className="border-t border-[#e8dfcc] pt-10">
      <LuxeReveal className="flex items-end justify-between gap-3 px-0.5">
        <div>
          <p className="flex items-center gap-2.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8a6d3f] before:h-px before:w-6 before:bg-[#b08d57]">Stay with us</p>
          <h2 id="menu-stay-title" className="mt-1.5 text-[1.7rem] font-light leading-none text-[#10231a]" style={LUXE_SERIF}>Accommodation</h2>
        </div>
        <p className="pb-0.5 text-right text-[10.5px] leading-snug text-[#10231a]/50">Free to reserve<br />Pay at the desk</p>
      </LuxeReveal>

      <div className="-mx-4 mt-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:scroll-px-6 sm:px-6">
        {rooms.map((r) => (
          <div key={r.id} className="w-[82%] max-w-[340px] shrink-0 snap-start">
            <RoomShowcaseCard room={r} place={venueName} onOpen={r.open} />
          </div>
        ))}
      </div>

      {stayHref && (
        <button type="button" onClick={() => router.push(stayHref)}
          className="mt-3 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] text-[12px] font-semibold uppercase tracking-[0.18em] text-[#f5f1e8] shadow-[0_12px_24px_-14px_rgba(15,42,30,0.85)] ring-1 ring-[#d9c193]/30">
          Explore &amp; reserve
        </button>
      )}
    </section>
  );
}

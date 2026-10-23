'use client';

import React from 'react';
import { LUXE_FONT_VAR } from '@/components/guest/luxe/luxe-theme';
import { BeyondDiningSection } from '@/components/guest/menu/BeyondDiningSection';
import { VenueServicesMarquee } from '@/components/guest/menu/VenueServicesMarquee';
import { EventCard } from '@/components/guest/events/EventCard';
import type { MenuItem } from '@/components/guest/menu/types';
import type { GuestEvent } from '@/components/guest/events/event-format';

const M = '/media/vibers';
// Fictional services and one event for The Juniper Table, with the landing page's own photography.
const SERVICES: MenuItem[] = [
  { id: 's1', name: 'Sunrise trek to the ridge', category: 'Tours', price: 600, image_url: `${M}/photo-walk-v1.webp` },
  { id: 's2', name: 'Private bonfire evening', category: 'Experiences', price: 1500, image_url: `${M}/photo-bonfire-v1.webp` },
  { id: 's3', name: 'Poolside spa ritual', category: 'Wellness', price: 2200, image_url: `${M}/photo-spa-phone-v1.webp` },
  { id: 's4', name: 'Horse ride on the shore', category: 'Rental', price: 1800, image_url: `${M}/photo-horse-v1.webp` },
];
const EVENT: GuestEvent = {
  id: 'e1', title: 'Saturday courtyard supper', description: 'Long tables under the lights, a set menu from the chef and live acoustic sets.',
  banner_url: `${M}/photo-courtyard-v1.webp`, category: 'Supper club', starts_at: '2026-10-24T14:00:00.000Z', ends_at: null,
  entry_fee: 899, perks: ['Welcome drink', 'Live music'], spots_left: 8, spots_left_men: null, spots_left_women: null, has_split: false, is_live_now: true,
};

/** The menu's venue services (the drifting row and the grid at the foot) and an event card, for the showcase. */
export function ServicesScreen() {
  return (
    <div className={`${LUXE_FONT_VAR} min-h-screen bg-[#f5f1e8] px-4 pb-10 pt-4`}>
      <VenueServicesMarquee services={SERVICES} onSelectService={() => undefined} />
      <div className="mt-6 max-w-[360px]"><EventCard event={EVENT} onInterested={() => undefined} /></div>
      <BeyondDiningSection services={SERVICES} onSelectService={() => undefined} />
    </div>
  );
}

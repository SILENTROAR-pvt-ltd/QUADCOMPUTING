'use client';

import React from 'react';
import { LiveEventsManager } from '../guests/LiveEventsManager';
import { EventLeadsTab } from '../guests/EventLeadsTab';
import { LiveOffersManager } from '../catalog/components/LiveOffersManager';

const SECTION = 'text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500';

/**
 * Events in Reservations: the same live-events manager as the menu catalogue's "Live Events & Offers" and My Guests
 * (create, publish, hide, cancel), then each event's guest list with confirm / decline.
 */
export function ReservationEventsPanel() {
  return (
    <div className="space-y-6">
      <section aria-label="Live events" className="space-y-3">
        <p className={SECTION}>Live events</p>
        <LiveEventsManager />
      </section>
      <section aria-label="Guest lists" className="space-y-3">
        <p className={SECTION}>Guest lists</p>
        <EventLeadsTab />
      </section>
    </div>
  );
}

/** Offers in Reservations: the same live-offers manager (create with a photo, pause, delete) and the guests' requests. */
export function ReservationOffersPanel({ venueId }: { venueId: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <LiveOffersManager venueId={venueId} />
    </div>
  );
}

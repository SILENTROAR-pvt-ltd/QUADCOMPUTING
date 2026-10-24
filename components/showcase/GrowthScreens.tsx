'use client';

import React from 'react';
import { MyGuestsWorkspace } from '@/components/host/workspaces/guests/MyGuestsWorkspace';
import { LiveOffersManager } from '@/components/host/workspaces/catalog/components/LiveOffersManager';
import { ServiceRequestsPanel } from '@/components/host/workspaces/reservations/ServiceRequestsPanel';
import { VendorCard } from '@/components/host/workspaces/vendors/VendorCard';
import { vendors } from '@/lib/showcase/demo-extras';
import { DEMO_VENUE } from '@/lib/showcase/demo-orders';
import { Chrome } from './ShowcaseChrome';
import { installShowcaseFetch } from './showcase-fetch';

// Installed as this module loads, before any workspace below mounts and reads its routes.
installShowcaseFetch();

const noop = () => undefined;
const HEAD = 'font-serif text-3xl tracking-tight text-neutral-950';

/** My Guests: the venue's guests, its live events, and everyone who tapped "I'm interested" (the real workspace). */
export const EventsScreen = () => <Chrome tab="guests"><MyGuestsWorkspace /></Chrome>;

/** Live offers with the guests' redemption codes and questions arriving under them. */
export const OffersScreen = () => (
  <Chrome tab="catalog">
    <header>
      <h1 className={HEAD}>Live offers</h1>
      <p className="mt-1 text-sm text-neutral-500">Deals guests see on the menu and in the lounge, and the codes they redeem at your counter.</p>
    </header>
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"><LiveOffersManager venueId={DEMO_VENUE.id} /></div>
  </Chrome>
);

/** Venue services guests ask for from the menu, beside the partners who fulfil them. */
export const ServicesScreen = () => (
  <Chrome tab="reservations">
    <header>
      <h1 className={HEAD}>Services & partners</h1>
      <p className="mt-1 text-sm text-neutral-500">Every service a guest books from the menu rings here; your partners take it from there.</p>
    </header>
    <div className="grid grid-cols-[1.25fr_1fr] items-start gap-5">
      <ServiceRequestsPanel venueId={DEMO_VENUE.id} />
      <div className="space-y-3">
        {vendors.slice(0, 2).map((v) => <VendorCard key={v.id} vendor={v} onEdit={noop} onShare={noop} onRemove={async () => undefined} />)}
      </div>
    </div>
  </Chrome>
);

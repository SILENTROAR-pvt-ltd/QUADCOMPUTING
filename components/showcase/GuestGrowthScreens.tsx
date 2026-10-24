'use client';

import React, { useState } from 'react';
import { LUXE_FONT_VAR, LUXE_SERIF } from '@/components/guest/luxe/luxe-theme';
import { LiveEventsFeed } from '@/components/guest/events/LiveEventsFeed';
import { OfferTicker } from '@/components/guest/offers/OfferTicker';
import { RecipeCubeCard } from '@/components/guest/menu/RecipeCubeCard';
import { DISH_GRID } from '@/components/guest/menu/DiningFeedStates';
import { BeyondDiningSection } from '@/components/guest/menu/BeyondDiningSection';
import { VenueServiceModal } from '@/components/guest/menu/VenueServiceModal';
import { LuxuryToast } from '@/components/guest/menu/LuxuryToast';
import { showGuestToast } from '@/components/guest/menu/toast-store';
import type { MenuItem } from '@/components/guest/menu/types';
import { guestDishes } from '@/lib/showcase/demo-extras';
import { demoGuestServices } from '@/lib/showcase/demo-growth';
import { DEMO_VENUE } from '@/lib/showcase/demo-orders';
import { installShowcaseFetch } from './showcase-fetch';

// Installed as this module loads, before the guest components below read their routes.
installShowcaseFetch();

const noop = () => undefined;

/** The venue's name over the page, as the guest app shows it, so each recording reads as the same café's menu. */
function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${LUXE_FONT_VAR} min-h-screen bg-[#f5f1e8] px-4 pb-16 pt-5 text-[#10231a]`}>
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.28em] text-[#8a6d3f]">Table T-04 · welcome to</p>
      <h1 className="mt-1 text-[2rem] font-light leading-none" style={LUXE_SERIF}>{DEMO_VENUE.name}</h1>
      <div className="mt-6 space-y-6">{children}</div>
    </div>
  );
}

/** The venue's live events in the lounge: the guest taps "I'm Interested" and asks for a place for their party. */
export const GuestEventsScreen = () => <Page><LiveEventsFeed venueId={DEMO_VENUE.id} layout="grid" /></Page>;

/** Live offers above the menu: the guest opens one, redeems it for a code, and the counter settles it. */
export const GuestOffersScreen = () => (
  <Page>
    <OfferTicker venueId={DEMO_VENUE.id} tableNumber="T-04" />
    <div className={DISH_GRID}>
      {guestDishes.slice(0, 4).map((d) => <RecipeCubeCard key={d.id} item={d} cartQuantity={0} priority onIncrement={noop} onDecrement={noop} />)}
    </div>
  </Page>
);

/**
 * Services beyond dining at the foot of the menu: the guest opens one and requests it. As on the live menu, the sheet
 * shows "sending", closes, and the house toast confirms (here without calling the venue).
 */
export function GuestServiceScreen() {
  const [open, setOpen] = useState<MenuItem | null>(null);
  const [sending, setSending] = useState(false);
  const request = (svc: MenuItem) => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setOpen(null);
      showGuestToast(`${svc.name} is requested. The host will confirm with you shortly.`);
    }, 900);
  };
  return (
    <Page>
      <BeyondDiningSection services={demoGuestServices} onSelectService={setOpen} />
      <VenueServiceModal service={open} isSent={sending} onClose={() => setOpen(null)} onRequest={request} />
      <LuxuryToast />
    </Page>
  );
}

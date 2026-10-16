'use client';

import React from 'react';
import { LiveOrderTracker } from './LiveOrderTracker';
import { OfferTicker } from '@/components/guest/offers/OfferTicker';
import { HostTopPicks } from './HostTopPicks';
import { GuestFavouritesRail } from './GuestFavouritesRail';
import { MenuDishList } from './MenuDishList';
import { VenueServicesMarquee } from './VenueServicesMarquee';
import { BeyondDiningSection } from './BeyondDiningSection';
import { MenuInfoPanel } from './MenuInfoPanel';
import type { MenuInfo } from '@/lib/services/menu-info/menu-info';
import { LiveEventsFeed } from '@/components/guest/events/LiveEventsFeed';
import type { DishLikesView } from './DiningFeed';
import type { GuestMenuState } from './hooks/useGuestMenuState';

interface MenuTabBodyProps {
  state: GuestMenuState;
  venueId: string;
  info: MenuInfo;
  likes?: DishLikesView;
  /** Services unlock once an order is placed (or has just been settled). */
  orderPlaced: boolean;
  trackerProps: React.ComponentProps<typeof LiveOrderTracker>;
}

/** The menu tab: the tracker once an order is placed, the picks, the whole menu, then the venue's services and live events. */
export function MenuTabBody({ state, venueId, info, likes, orderPlaced, trackerProps }: MenuTabBodyProps) {
  const toServices = (title?: string) => {
    state.setShowBeyondDining(true);
    if (title) state.showToast(`Selected: ${title}`);
    setTimeout(() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' }), 150);
  };
  return (
    <div className="space-y-4 sm:space-y-5">
      {orderPlaced && <LiveOrderTracker {...trackerProps} />}
      <OfferTicker venueId={venueId} tableNumber={state.tableNumber} />
      <HostTopPicks featured={info.featured} items={state.diningItems} getItemCartQuantity={state.getItemCartQuantity} onAdd={state.handleItemIncrement} />
      {likes && (
        <GuestFavouritesRail items={state.diningItems} likes={likes} venueName={state.businessName}
          getItemCartQuantity={state.getItemCartQuantity} onAdd={state.handleItemIncrement} />
      )}

      <MenuDishList state={state} likes={likes} />

      {/* Moments and the venue's services open up once an order is placed: until then the dishes come first. */}
      {orderPlaced && (
        <>
          <VenueServicesMarquee services={state.venueServices} onSelectService={(s) => toServices(s.title)} />
          <LiveEventsFeed venueId={venueId} layout="rail" hideWhenEmpty />
          {state.venueServices.length > 0 && <BeyondDiningSection services={state.venueServices} onSelectService={state.setSelectedService} />}
        </>
      )}
      <MenuInfoPanel info={info} />
    </div>
  );
}

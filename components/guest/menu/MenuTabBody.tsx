'use client';

import React from 'react';
import { LiveOrderTracker } from './LiveOrderTracker';
import { OfferTicker } from '@/components/guest/offers/OfferTicker';
import { HostTopPicks } from './HostTopPicks';
import { GuestFavouritesRail } from './GuestFavouritesRail';
import { MenuDishList } from './MenuDishList';
import { BeyondDiningSection } from './BeyondDiningSection';
import { MenuInfoPanel } from './MenuInfoPanel';
import { MenuStaySection, isAccommodation } from './stay/MenuStaySection';
import { MemoryVault } from './vault/MemoryVault';
import type { MenuInfo } from '@/lib/services/menu-info/menu-info';
import { LiveEventsFeed } from '@/components/guest/events/LiveEventsFeed';
import { isRoomTable } from '@/lib/guest/room-mode';
import type { DishLikesView } from './DiningFeed';
import type { GuestMenuState } from './hooks/useGuestMenuState';

interface MenuTabBodyProps {
  state: GuestMenuState;
  venueId: string;
  info: MenuInfo;
  likes?: DishLikesView;
  /** Shows the live order tracker at the top once an order is placed (or has just been settled). */
  orderPlaced: boolean;
  trackerProps: React.ComponentProps<typeof LiveOrderTracker>;
}

/**
 * The menu tab: the tracker once an order is placed, the picks and the whole menu. Then, once the dishes are done, the
 * venue itself: its rooms, its memory vault, its live events, and what it offers beyond dining.
 */
export function MenuTabBody({ state, venueId, info, likes, orderPlaced, trackerProps }: MenuTabBodyProps) {
  const others = state.venueServices.filter((s) => !isAccommodation(s));
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

      {/* After the dishes, the place: a guest already in a room is not offered one. */}
      {!isRoomTable(state.tableNumber) && (
        <MenuStaySection venueId={venueId} venueName={state.businessName} services={state.venueServices} onSelectService={state.setSelectedService} />
      )}
      <MemoryVault gallery={info.gallery} venueName={state.businessName} />
      <LiveEventsFeed venueId={venueId} layout="rail" hideWhenEmpty />
      {others.length > 0 && <BeyondDiningSection services={others} onSelectService={state.setSelectedService} />}
      <MenuInfoPanel info={info} />
    </div>
  );
}

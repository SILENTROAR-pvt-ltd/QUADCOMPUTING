'use client';

import React, { useMemo } from 'react';
import { MenuHeader } from './MenuHeader';
import { bannerPhotos } from './hero/banner-photos';
import { MenuJourneySteps } from './MenuJourneySteps';
import { ServiceCallBar } from './ServiceCallBar';
import { GuestAccountStrip } from '@/components/guest/account/GuestAccountStrip';
import type { GuestMenuState } from './hooks/useGuestMenuState';

interface MenuTopProps {
  state: GuestMenuState;
  venueId: string;
  guestName?: string;
  tagline?: string;
  onOpenBill: () => void;
  requestBill: () => void;
  /** Room mode: shown under the header, above the account bar; the table's service buttons give way to the room page. */
  roomBar?: React.ReactNode;
  /** The host's top picks, shown first in the banner's photos. */
  featured?: string[];
}

/** The top of the page: the header, then (on the menu tab) the journey steps, the account bar and the service buttons. */
export function MenuTop({ state, venueId, guestName, tagline, onOpenBill, requestBill, roomBar, featured }: MenuTopProps) {
  const onMenu = state.activeTab === 'menu';
  const photos = useMemo(() => bannerPhotos(state.diningItems, featured), [state.diningItems, featured]);
  return (
    <>
      <MenuHeader
        tableNo={state.tableNumber} guestName={guestName || state.currentGuestName} venueName={state.businessName}
        tagline={tagline} activeOrdersCount={state.sentItems.length} onOpenBill={onOpenBill}
        billRequestedBanner={state.billRequestedBanner} photos={photos}
      />
      {roomBar ? (
        // The same menu as at a table, with the room on top: the Vibers ID account bar and the journey stay, so cashback,
        // the wallet and the lounge are all there; the waiter and bill buttons are not, a room asks for those on its own page.
        <div className="mx-auto max-w-5xl space-y-2.5 pb-2.5 pt-1">
          {roomBar}
          {onMenu && <div className="flex w-full justify-center px-4 sm:px-6"><MenuJourneySteps cartCount={state.totalCartCount} sentCount={state.sentItems.length} roomMode /></div>}
          <GuestAccountStrip venueId={venueId} tableNumber={state.tableNumber} />
        </div>
      ) : onMenu ? (
        <div className="mx-auto max-w-5xl space-y-2.5 px-4 pb-2.5 pt-2 sm:px-6">
          <div className="flex w-full justify-center">
            <MenuJourneySteps cartCount={state.totalCartCount} sentCount={state.sentItems.length} />
          </div>
          <GuestAccountStrip venueId={venueId} tableNumber={state.tableNumber} />
          <ServiceCallBar
            venueId={venueId} tableNo={state.tableNumber} hasOrderPlaced={state.hasActiveOrder || state.sentItems.length > 0}
            onRequestBill={requestBill} isRequestingBill={state.isRequestingBill} billRequested={state.billRequestedBanner}
          />
        </div>
      ) : (
        <div className="pb-2 pt-1"><GuestAccountStrip venueId={venueId} tableNumber={state.tableNumber} /></div>
      )}
    </>
  );
}

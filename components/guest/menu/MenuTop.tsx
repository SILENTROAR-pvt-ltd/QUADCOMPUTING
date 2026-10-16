'use client';

import React from 'react';
import { MenuHeader } from './MenuHeader';
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
}

/** The top of the page: the header, then (on the menu tab) the journey steps, the account bar and the service buttons. */
export function MenuTop({ state, venueId, guestName, tagline, onOpenBill, requestBill }: MenuTopProps) {
  return (
    <>
      <MenuHeader
        tableNo={state.tableNumber} guestName={guestName || state.currentGuestName} venueName={state.businessName}
        tagline={tagline} activeOrdersCount={state.sentItems.length} onOpenBill={onOpenBill}
        billRequestedBanner={state.billRequestedBanner}
      />
      {state.activeTab === 'menu' ? (
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

'use client';

import React from 'react';
import { ActiveBillView } from './ActiveBillView';
import { BillWalletRedeem } from './BillWalletRedeem';
import { MenuTabBody } from './MenuTabBody';
import { GuestMeView } from '@/components/guest/me/GuestMeView';
import type { GuestMenuState } from './hooks/useGuestMenuState';

type TabBodyProps = React.ComponentProps<typeof MenuTabBody>;

interface MenuBodyProps extends Omit<TabBodyProps, 'state'> {
  state: GuestMenuState;
  settled: boolean;
  requestBill: () => void;
  goTab: (tab: 'menu' | 'live_order' | 'me') => void;
  selectTab: (tab: 'menu' | 'bill' | 'me') => void;
}

/** The page's main area: the menu, the guest's own space (Me), or the running bill, whichever tab is open. */
export function MenuBody({ state, venueId, settled, requestBill, goTab, selectTab, ...menu }: MenuBodyProps) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-36 pt-2 sm:px-6 sm:pb-40">
      {state.activeTab === 'menu' ? (
        <MenuTabBody state={state} venueId={venueId} {...menu} />
      ) : state.activeTab === 'me' ? (
        <GuestMeView
          cafeId={venueId} tableNumber={state.tableNumber} venueName={state.businessName} runningTotal={state.runningTotal}
          hasActiveOrder={state.hasActiveOrder || state.sentItems.length > 0} billSettled={settled}
          onOpenBill={() => selectTab('bill')} onOpenMenu={() => selectTab('menu')}
        />
      ) : (
        <ActiveBillView
          tableNumber={state.tableNumber} runningTotal={state.runningTotal} sentItems={state.sentItems}
          onRequestBill={requestBill} isRequestingBill={state.isRequestingBill} onBackToMenu={() => goTab('menu')}
          billRequested={state.billRequestedBanner} billSettled={state.billSettled} settledTotal={state.settledTotal}
          cashbackCredited={state.cashbackCredited} taxAmount={Number((state.masterOrder as any)?.tax_amount) || 0}
          redeemSlot={<BillWalletRedeem cafeId={venueId} tableNumber={state.tableNumber} />}
        />
      )}
    </main>
  );
}

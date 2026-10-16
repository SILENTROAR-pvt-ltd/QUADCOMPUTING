'use client';

import React, { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MenuSkeleton } from '@/components/guest/menu/MenuSkeleton';
import { MenuTop } from '@/components/guest/menu/MenuTop';
import { MenuBody } from '@/components/guest/menu/MenuBody';
import { MenuDock } from '@/components/guest/menu/MenuDock';
import { MenuModalsHost } from '@/components/guest/menu/MenuModalsHost';
import { MenuUnavailable } from '@/components/guest/menu/MenuUnavailable';
import { FinalizeBillSheet } from '@/components/guest/menu/FinalizeBillSheet';
import { LuxuryToast } from '@/components/guest/menu/LuxuryToast';
import { ActiveBillView } from '@/components/guest/menu/ActiveBillView';
import { BillWalletRedeem } from '@/components/guest/menu/BillWalletRedeem';
import { GuestMeView } from '@/components/guest/me/GuestMeView';
import { ReservationStrip } from '@/components/guest/reservations/ReservationStrip';
import { DeliveryTrackerCard } from '@/components/guest/delivery/DeliveryTrackerCard';
import { DeliveryEntry } from '@/components/guest/delivery/DeliveryEntry';
import { guestHref } from '@/components/guest/shell/GuestTabBar';
import { useMenuInfo } from '@/components/guest/menu/MenuInfoPanel';
import { useTableService } from '@/components/guest/menu/useTableService';
import { useGuestMenuState } from '@/components/guest/menu/hooks/useGuestMenuState';
import { useDishLikes } from '@/components/guest/menu/hooks/useDishLikes';
import { useMenuRoute } from '@/components/guest/menu/hooks/useMenuRoute';
import { useMenuTabs } from '@/components/guest/menu/hooks/useMenuTabs';
import { useMenuBill } from '@/components/guest/menu/hooks/useMenuBill';
import { buildDialActions } from '@/components/guest/menu/dial-actions';
import { useGuestAccount } from '@/lib/guest/use-guest-account';
import { useGuestAddressHandle, useGuestDocumentTitle } from '@/lib/guest/use-guest-title';

function GuestMenuContent() {
  const router = useRouter();
  const { tableParam, cafeParam, sectionParam, tabParam } = useMenuRoute();
  const state = useGuestMenuState({ tableParam, cafeParam });
  const venueId = cafeParam || state.activeSession?.business_id || '';
  // Hearts and the favourites rail appear once the venue's database has dish likes.
  const dishLikes = useDishLikes(venueId, state.showToast);
  const likes = dishLikes.available ? dishLikes : undefined;
  const menuInfo = useMenuInfo(venueId);
  // Table service is asked for from the quick-actions button, so it lives here once.
  const tableService = useTableService(venueId, state.tableNumber, state.showToast);
  const { goTab, selectTab } = useMenuTabs(state, tabParam, sectionParam);
  const bill = useMenuBill(state);
  const [trackerOpen, setTrackerOpen] = useState(0);

  // The tab title shows who is signed in and which tab is open (the address stays clean).
  const { account, loading: accountLoading } = useGuestAccount(venueId);
  useGuestDocumentTitle(state.activeTab === 'live_order' ? 'Bill' : state.activeTab === 'me' ? 'Me' : 'Menu', account?.handle ?? null);
  useGuestAddressHandle(account?.handle ?? null, !accountLoading);

  const lounge = () => router.push(guestHref('/guest/lobby', state.tableNumber, venueId));
  const toServices = () => {
    state.setShowBeyondDining(true);
    setTimeout(() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' }), 150);
  };

  // Venue services unlock once an order is placed (or has just been settled).
  const settled = state.billSettled && state.settledTotal > 0;
  const orderPlaced = state.hasActiveOrder || state.sentItems.length > 0 || settled;

  const trackerProps = {
    tableNumber: state.tableNumber, kotStatus: state.kotStatus, orderStatus: state.masterOrder?.status,
    ticketNumber: state.ticketNumber, items: state.sentItems, runningTotal: state.runningTotal, isAddon: state.isRecentAddon,
    onViewBill: () => goTab('live_order'), onRequestBill: bill.requestBill, isRequestingBill: state.isRequestingBill,
    billRequested: state.billRequestedBanner, billSettled: settled, settledTotal: state.settledTotal,
    cashbackCredited: state.cashbackCredited, venueId, orderId: state.masterOrder?.id, signedIn: Boolean(account),
    cafeName: state.businessName, onExploreLounge: lounge, onRefresh: state.handleManualTrackerRefresh,
    isRefreshing: state.isRefreshingTracker, openRequest: trackerOpen,
  };

  const dialActions = buildDialActions({
    settled, billReady: bill.billReady, billRequested: state.billRequestedBanner, hasServices: state.venueServices.length > 0,
    openProfile: () => selectTab('me'), openService: tableService.open, requestBill: bill.requestBill, goToServices: toServices,
    openLounge: lounge,
    openTracker: () => {
      setTrackerOpen((n) => n + 1);
      document.getElementById('live-order-tracker')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
  });

  if (state.isLoadingMenu) return <MenuSkeleton />;
  if (state.menuError) return <MenuUnavailable message={state.menuError} />;

  // overflow-x-clip, not hidden: hidden would make the root a scroll box and break the sticky filter bar.
  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-clip bg-[#faf9f6] pb-36 font-sans text-neutral-900 selection:bg-neutral-900 selection:text-white sm:pb-40">
      <LuxuryToast message={state.toastMessage} />
      <MenuTop state={state} venueId={venueId} guestName={account?.display_name} tagline={menuInfo.tagline}
        onOpenBill={() => goTab('live_order')} requestBill={bill.requestBill} />

      {state.activeTab === 'menu' && venueId && (
        <div className="mx-auto mt-4 grid w-full max-w-3xl grid-cols-2 gap-3 px-4">
          <DeliveryEntry cafeId={venueId} />
          <ReservationStrip venueId={venueId} venueName={state.businessName || 'Venue'} initialName={state.guestNameInput} initialPhone={state.guestPhoneInput} />
        </div>
      )}
      {state.activeTab === 'menu' && venueId && <DeliveryTrackerCard venueId={venueId} />}
      <MenuBody state={state} venueId={venueId} info={menuInfo} likes={likes} orderPlaced={orderPlaced} trackerProps={trackerProps}
        settled={settled} requestBill={bill.requestBill} goTab={goTab} selectTab={selectTab} />

      {tableService.sheet}
      {bill.finalizeOpen && (
        <FinalizeBillSheet cafeId={venueId} tableNumber={state.tableNumber} billTotal={Number(state.runningTotal) || 0}
          onConfirm={state.handleRequestBill} onClose={bill.closeFinalize} />
      )}

      <MenuDock state={state} venueId={venueId} dialActions={dialActions} showDial={orderPlaced && state.activeTab === 'menu'} goTab={goTab} selectTab={selectTab} />

      <MenuModalsHost
        state={state} cafeId={cafeParam} featuredIds={menuInfo.featured}
        onExploreServices={() => {
          state.setOrderCelebration(false);
          toServices();
        }}
        onExploreLounge={() => { state.setOrderCelebration(false); lounge(); }}
      />
    </div>
  );
}

export default function GuestMenuPage() {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <GuestMenuContent />
    </Suspense>
  );
}


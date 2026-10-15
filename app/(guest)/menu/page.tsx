'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MenuHeader } from '@/components/guest/menu/MenuHeader';
import { MenuSkeleton } from '@/components/guest/menu/MenuSkeleton';
import { DiningFilters } from '@/components/guest/menu/DiningFilters';
import { MenuJourneySteps } from '@/components/guest/menu/MenuJourneySteps';
import { FinalizeBillSheet } from '@/components/guest/menu/FinalizeBillSheet';
import { resolveTrackerStage } from '@/components/guest/menu/tracker/tracker-copy';
import { ServiceCallBar } from '@/components/guest/menu/ServiceCallBar';
import { DiningFeed } from '@/components/guest/menu/DiningFeed';
import { BeyondDiningSection } from '@/components/guest/menu/BeyondDiningSection';
import { VenuePhotoVault } from '@/components/guest/lobby/VenuePhotoVault';
import { LuxuryToast } from '@/components/guest/menu/LuxuryToast';
import { ActiveBillView } from '@/components/guest/menu/ActiveBillView';
import { BillWalletRedeem } from '@/components/guest/menu/BillWalletRedeem';
import { FloatingCartBar } from '@/components/guest/menu/FloatingCartBar';
import { OfferTicker } from '@/components/guest/offers/OfferTicker';
import { HostTopPicks } from '@/components/guest/menu/HostTopPicks';
import { QuickActionsDial, type DialAction } from '@/components/guest/menu/QuickActionsDial';
import { useTableService } from '@/components/guest/menu/useTableService';
import { GuestTabBar, guestHref } from '@/components/guest/shell/GuestTabBar';
import { GuestMeView } from '@/components/guest/me/GuestMeView';
import { GuestAccountStrip } from '@/components/guest/account/GuestAccountStrip';
import { LiveOrderTracker } from '@/components/guest/menu/LiveOrderTracker';
import { VenueServicesMarquee } from '@/components/guest/menu/VenueServicesMarquee';
import { MenuModalsHost } from '@/components/guest/menu/MenuModalsHost';
import { useGuestMenuState } from '@/components/guest/menu/hooks/useGuestMenuState';
import { useDishLikes } from '@/components/guest/menu/hooks/useDishLikes';
import { GuestFavouritesRail } from '@/components/guest/menu/GuestFavouritesRail';
import { MenuInfoPanel, useMenuInfo } from '@/components/guest/menu/MenuInfoPanel';
import { useGuestAccount } from '@/lib/guest/use-guest-account';
import { categoryCovers } from '@/lib/guest/category-covers';
import { useGuestAddressHandle, useGuestDocumentTitle } from '@/lib/guest/use-guest-title';

function GuestMenuContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawTableParam = searchParams.get('table') || searchParams.get('table_number') || 'T-01';
  const tableMatch = rawTableParam.match(/[a-zA-Z0-9-]+/);
  const tableParam = tableMatch ? tableMatch[0] : 'T-01';

  const rawCafeParam =
    searchParams.get('business_id') || searchParams.get('cafe_id') || searchParams.get('venue') || searchParams.get('cafe') || '';
  const uuidMatch = rawCafeParam.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  const cafeParam = uuidMatch
    ? uuidMatch[0]
    : rawCafeParam.trim()
    ? rawCafeParam.trim().split(/[\s,]+/)[0]
    : '';

  const sectionParam = searchParams.get('section');
  const tabParam = searchParams.get('tab');
  const state = useGuestMenuState({ tableParam, cafeParam });
  const venueId = cafeParam || state.activeSession?.business_id || '';
  // Hearts and the favourites rail appear once the venue's database has dish likes.
  const dishLikes = useDishLikes(venueId, state.showToast);
  const likesView = dishLikes.available ? dishLikes : undefined;
  const menuInfo = useMenuInfo(venueId);
  // Table service can be asked for from the tracker bar and the quick-actions button, so it lives here once.
  const tableService = useTableService(venueId, state.tableNumber, state.showToast);
  // How many dishes each category holds, for the filter chips. "dining" is every dish.
  const dishCounts = useMemo(() => {
    const counts: Record<string, number> = { dining: state.diningItems.length };
    for (const item of state.diningItems) {
      const k = (item.category || '').trim().toLowerCase();
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }, [state.diningItems]);
  // A photo of one of each category's own dishes, for the same chips.
  const dishCovers = useMemo(() => categoryCovers(state.diningItems), [state.diningItems]);

  // The tab title shows who is signed in and which tab is open (the address stays clean).
  const { account: titleAccount, loading: titleLoading } = useGuestAccount(venueId);
  useGuestDocumentTitle(state.activeTab === 'live_order' ? 'Bill' : state.activeTab === 'me' ? 'Me' : 'Menu', titleAccount?.handle ?? null);
  useGuestAddressHandle(titleAccount?.handle ?? null, !titleLoading);

  // Deep links from the lounge / tab bar: ?tab=bill | ?tab=me
  useEffect(() => {
    if (tabParam === 'bill') state.setActiveTab('live_order');
    else if (tabParam === 'me') state.setActiveTab('me');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

  // Every tab switch goes through here, so the open tab survives a refresh and the
  // URL is shareable. Only the tab is written; account details never go in the URL.
  const goTab = (tab: 'menu' | 'live_order' | 'me') => {
    state.setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === 'menu') url.searchParams.delete('tab');
    else url.searchParams.set('tab', tab === 'live_order' ? 'bill' : 'me');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectTab = (tab: 'menu' | 'bill' | 'me') => goTab(tab === 'bill' ? 'live_order' : tab);

  useEffect(() => {
    if (sectionParam === 'portal' || sectionParam === 'services') {
      goTab('menu');
      state.setShowBeyondDining(true);
      const timer = setTimeout(() => {
        document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs only when the ?section= link changes; goTab and state change every render and would re-scroll the page
  }, [sectionParam]);

  const [trackerOpenRequest, setTrackerOpenRequest] = useState(0);

  // The bill can be asked for only once the food is ready or served; every bill button goes through this.
  const billReady = ['ready', 'served'].includes(resolveTrackerStage(String(state.kotStatus || ''), String(state.masterOrder?.status || '')));
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const requestBill = () => {
    if (state.billRequestedBanner) state.showToast('Your bill is on its way. Our team will bring it to your table.');
    else if (billReady) setFinalizeOpen(true);
    else state.showToast('You can request the bill once your food is ready.');
  };

  if (state.isLoadingMenu) return <MenuSkeleton />;

  if (state.menuError) {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-neutral-950 px-6 text-center text-white">
        <h1 className="font-serif text-3xl font-light mb-2">Unavailable</h1>
        <p className="text-sm text-neutral-400 max-w-sm mb-6">{state.menuError}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl border border-neutral-800 bg-neutral-900 px-6 py-2.5 text-[10px] uppercase tracking-widest text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Venue services unlock once an order is placed (or has just been settled): until then the dishes come first, with no services above them.
  const orderPlaced = state.hasActiveOrder || state.sentItems.length > 0 || (state.billSettled && state.settledTotal > 0);

  const settled = state.billSettled && state.settledTotal > 0;
  const goToServices = () => {
    state.setShowBeyondDining(true);
    setTimeout(() => { document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' }); }, 150);
  };
  const trackerProps = {
    tableNumber: state.tableNumber,
    kotStatus: state.kotStatus,
    orderStatus: state.masterOrder?.status,
    ticketNumber: state.ticketNumber,
    items: state.sentItems,
    runningTotal: state.runningTotal,
    isAddon: state.isRecentAddon,
    onViewBill: () => goTab('live_order'),
    onRequestBill: requestBill,
    isRequestingBill: state.isRequestingBill,
    billRequested: state.billRequestedBanner,
    billSettled: settled,
    settledTotal: state.settledTotal,
    cashbackCredited: state.cashbackCredited,
    venueId,
    orderId: state.masterOrder?.id,
    signedIn: Boolean(titleAccount),
    cafeName: state.businessName,
    onExploreLounge: () => router.push(guestHref('/guest/lobby', state.tableNumber, venueId)),
    onRefresh: state.handleManualTrackerRefresh,
    isRefreshing: state.isRefreshingTracker,
    openRequest: trackerOpenRequest,
  };
  // The places a guest goes next, in one round button: nearest the thumb first.
  const dialActions: DialAction[] = [
    { id: 'profile', label: 'My profile', onSelect: () => selectTab('me') },
    { id: 'service', label: 'Table service', onSelect: tableService.open },
    {
      id: 'tracker',
      label: 'Order tracker',
      onSelect: () => {
        setTrackerOpenRequest((n) => n + 1);
        document.getElementById('live-order-tracker')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    },
    ...(settled || (!billReady && !state.billRequestedBanner) ? [] : [{ id: 'bill' as const, label: state.billRequestedBanner ? 'Bill requested' : 'Request bill', onSelect: requestBill, done: state.billRequestedBanner }]),
    ...(state.venueServices.length > 0 ? [{ id: 'services' as const, label: 'Venue services', onSelect: goToServices }] : []),
    { id: 'lounge', label: 'Lounge', onSelect: () => router.push(guestHref('/guest/lobby', state.tableNumber, venueId)) },
  ];

  // overflow-x-clip, not hidden: hidden would make the root a scroll box and break the sticky filter bar.
  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-clip bg-[#faf9f6] text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white pb-36 sm:pb-40">
      <LuxuryToast message={state.toastMessage} />

      <MenuHeader
        tableNo={state.tableNumber}
        guestName={titleAccount?.display_name || state.currentGuestName}
        venueName={state.businessName}
        tagline={menuInfo.tagline}
        activeOrdersCount={state.sentItems.length}
        onOpenBill={() => goTab('live_order')}
        billRequestedBanner={state.billRequestedBanner}
      />

      {state.activeTab === 'menu' ? (
        <div className="mx-auto max-w-5xl space-y-2.5 px-4 pb-2.5 pt-2 sm:px-6">
          <div className="flex w-full justify-center">
            <MenuJourneySteps cartCount={state.totalCartCount} sentCount={state.sentItems.length} />
          </div>
          <GuestAccountStrip venueId={venueId} tableNumber={state.tableNumber} />
          <ServiceCallBar
            venueId={cafeParam || state.activeSession?.business_id || ''}
            tableNo={state.tableNumber}
            hasOrderPlaced={state.hasActiveOrder || state.sentItems.length > 0}
            onRequestBill={requestBill}
            isRequestingBill={state.isRequestingBill}
            billRequested={state.billRequestedBanner}
          />
        </div>
      ) : (
        <div className="pt-1 pb-2">
          <GuestAccountStrip venueId={venueId} tableNumber={state.tableNumber} />
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-2 pb-36 sm:pb-40">
        {state.activeTab === 'menu' ? (
          <div className="space-y-4 sm:space-y-5">

            {/* The order tracker sits right on the menu page, in full, once an order is placed. */}
            {orderPlaced && <LiveOrderTracker {...trackerProps} />}
            <OfferTicker venueId={venueId} tableNumber={state.tableNumber} />

            <HostTopPicks featured={menuInfo.featured} items={state.diningItems} getItemCartQuantity={state.getItemCartQuantity} onAdd={state.handleItemIncrement} />

            {likesView && (
              <GuestFavouritesRail
                items={state.diningItems}
                likes={likesView}
                venueName={state.businessName}
                getItemCartQuantity={state.getItemCartQuantity}
                onAdd={state.handleItemIncrement}
              />
            )}

            {/* The filter bar sticks to the top while the dishes are on screen, then scrolls away with them at the end of the menu. */}
            <div className="space-y-4 sm:space-y-5">
              <div className="sticky top-0 z-30 -mx-4 bg-[#faf9f6]/[0.97] px-4 pb-2 pt-1 sm:-mx-6 sm:px-6">
                <DiningFilters
                  searchQuery={state.searchQuery}
                  setSearchQuery={state.setSearchQuery}
                  categories={state.culinaryCategories}
                  selectedCategory={state.selectedCategory}
                  onSelectCategory={state.setSelectedCategory}
                  counts={dishCounts}
                  covers={dishCovers}
                  shownCount={state.filteredDiningItems.length}
                />
              </div>

              <DiningFeed
                items={state.filteredDiningItems}
                isLoading={state.isLoadingMenu}
                getItemCartQuantity={state.getItemCartQuantity}
                onIncrement={state.handleItemIncrement}
                onDecrement={state.handleItemDecrement}
                onOpenCustomization={state.handleOpenCustomization}
                onQuickAdd={state.handleQuickAdd}
                likes={likesView}
                searchActive={state.searchQuery.trim().length > 0}
              />
            </div>

            {/* After the dishes: "At your service" leads into "Beyond dining". Both unlock once an order is placed. */}
            {orderPlaced && (
              <VenueServicesMarquee
                services={state.venueServices}
                onSelectService={(service) => {
                  state.setShowBeyondDining(true);
                  state.showToast(`Selected: ${service.title}`);
                  setTimeout(() => {
                    document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' });
                  }, 150);
                }}
              />
            )}

            {/* The venue's own photos and events (created by the host in the photo vault), just above the venue services. */}
            <VenuePhotoVault venueId={venueId} tableNumber={state.tableNumber} layout="rail" hideWhenEmpty />

            {orderPlaced && state.venueServices.length > 0 && (
              <BeyondDiningSection
                services={state.venueServices}
                onSelectService={state.setSelectedService}
              />
            )}

            <MenuInfoPanel info={menuInfo} />
          </div>
        ) : state.activeTab === 'me' ? (
          <GuestMeView
            cafeId={venueId}
            tableNumber={state.tableNumber}
            venueName={state.businessName}
            runningTotal={state.runningTotal}
            hasActiveOrder={state.hasActiveOrder || state.sentItems.length > 0}
            billSettled={state.billSettled && state.settledTotal > 0}
            onOpenBill={() => selectTab('bill')}
            onOpenMenu={() => selectTab('menu')}
          />
        ) : (
          <ActiveBillView
            tableNumber={state.tableNumber}
            runningTotal={state.runningTotal}
            sentItems={state.sentItems}
            onRequestBill={requestBill}
            isRequestingBill={state.isRequestingBill}
            onBackToMenu={() => goTab('menu')}
            billRequested={state.billRequestedBanner}
            billSettled={state.billSettled}
            settledTotal={state.settledTotal}
            cashbackCredited={state.cashbackCredited}
            taxAmount={Number((state as any).masterOrder?.tax_amount) || 0}
            redeemSlot={<BillWalletRedeem cafeId={venueId} tableNumber={state.tableNumber} />}
          />
        )}
      </main>

      {tableService.sheet}
      {finalizeOpen && (
        <FinalizeBillSheet
          cafeId={venueId}
          tableNumber={state.tableNumber}
          billTotal={Number(state.runningTotal) || 0}
          onConfirm={state.handleRequestBill}
          onClose={() => setFinalizeOpen(false)}
        />
      )}

      {/* Apple-grade Floating Bottom Dock (Unified Stack). The quick-actions button sits in its corner, above the Me tab. */}
      <aside
        aria-label="Guest Floating Controls Dock"
        className="fixed bottom-3 sm:bottom-4 inset-x-0 z-50 flex flex-col items-center gap-2 sm:gap-2.5 px-3 pointer-events-none"
      >
        <div className="relative flex w-full max-w-md flex-col items-center gap-2 sm:gap-2.5">
          {orderPlaced && state.activeTab === 'menu' && <QuickActionsDial actions={dialActions} />}

          <FloatingCartBar
            totalCartCount={state.totalCartCount}
            cartSubtotal={state.cartSubtotal}
            tableNumber={state.tableNumber}
            sentItemsCount={state.sentItems.length}
            runningTotal={state.runningTotal}
            activeTab={state.activeTab}
            onOpenCartReview={() => state.setShowCartReview(true)}
            onToggleTab={() => goTab(state.activeTab === 'menu' ? 'live_order' : 'menu')}
          />

          <GuestTabBar
            active={state.activeTab === 'live_order' ? 'bill' : state.activeTab}
            tableNumber={state.tableNumber}
            cafeId={venueId}
            billTotal={state.sentItems.length > 0 ? state.runningTotal : 0}
            onSelect={selectTab}
          />
        </div>
      </aside>

      <MenuModalsHost
        isCustomizationOpen={state.isCustomizationOpen}
        onCloseCustomization={() => {
          state.setIsCustomizationOpen(false);
          state.setCustomizingItem(null);
        }}
        customizingItem={state.customizingItem}
        onAddToCart={(configuredItem) => {
          state.addToCart(configuredItem);
          state.showToast(`Added ${configuredItem.name} to order`);
        }}
        showCartReview={state.showCartReview}
        onCloseCartReview={() => state.setShowCartReview(false)}
        tableNumber={state.tableNumber}
        cartItems={state.cartItems}
        cartSubtotal={state.cartSubtotal}
        gstAmount={state.gstAmount}
        cartGrandTotal={state.cartGrandTotal}
        orderCookingNotes={state.orderCookingNotes}
        onNotesChange={state.setOrderCookingNotes}
        guestNameInput={state.guestNameInput}
        guestPhoneInput={state.guestPhoneInput}
        guestHandleInput={state.guestHandleInput}
        guestAvatarInput={state.guestAvatarInput}
        onGuestNameChange={state.setGuestNameInput}
        onGuestPhoneChange={state.setGuestPhoneInput}
        onGuestHandleChange={state.setGuestHandleInput}
        onGuestAvatarChange={state.setGuestAvatarInput}
        onSaveProfile={state.saveProfile}
        cafeId={cafeParam}
        isSendingToKitchen={state.isSendingToKitchen}
        onPlaceOrder={state.handlePlaceOrderToKitchen}
        onIncrement={state.incrementQuantity}
        onDecrement={state.decrementQuantity}
        onRemove={state.removeFromCart}
        hasActiveOrder={state.hasActiveOrder}
        menuItems={state.diningItems}
        featuredIds={menuInfo.featured}
        onQuickAdd={state.handleQuickAdd}
        selectedService={state.selectedService}
        onCloseServiceModal={() => state.setSelectedService(null)}
        onRequestService={state.handleConciergeServiceRequest}
        serviceNotificationSent={state.serviceNotificationSent}
        orderCelebration={state.orderCelebration}
        businessName={state.businessName}
        isAddonOrderSuccess={state.isAddonOrderSuccess}
        onCloseOrderCelebration={() => state.setOrderCelebration(false)}
        onExploreServices={() => {
          state.setOrderCelebration(false);
          state.setShowBeyondDining(true);
          setTimeout(() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
        }}
        onExploreLounge={() => {
          state.setOrderCelebration(false);
          router.push(guestHref('/guest/lobby', state.tableNumber, venueId));
        }}
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

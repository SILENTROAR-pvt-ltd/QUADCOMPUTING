'use client';

import React, { Suspense, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MenuHeader } from '@/components/guest/menu/MenuHeader';
import { DiningFilters } from '@/components/guest/menu/DiningFilters';
import { ServiceCallBar } from '@/components/guest/menu/ServiceCallBar';
import { DiningFeed } from '@/components/guest/menu/DiningFeed';
import { BeyondDiningSection } from '@/components/guest/menu/BeyondDiningSection';
import { ActiveBillView } from '@/components/guest/menu/ActiveBillView';
import { BillWalletRedeem } from '@/components/guest/menu/BillWalletRedeem';
import { FloatingCartBar } from '@/components/guest/menu/FloatingCartBar';
import { OfferTicker } from '@/components/guest/offers/OfferTicker';
import { GuestTabBar } from '@/components/guest/shell/GuestTabBar';
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
import { useGuestAddressHandle, useGuestDocumentTitle } from '@/lib/guest/use-guest-title';

function GuestMenuContent() {
  const searchParams = useSearchParams();
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
  // How many dishes each category holds, for the filter chips. "dining" is every dish.
  const dishCounts = useMemo(() => {
    const counts: Record<string, number> = { dining: state.diningItems.length };
    for (const item of state.diningItems) {
      const k = (item.category || '').trim().toLowerCase();
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }, [state.diningItems]);

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
  }, [sectionParam]);

  if (state.isLoadingMenu) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-white border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

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

  // overflow-x-clip, not hidden: hidden would make the root a scroll box and break the sticky filter bar.
  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-clip bg-[#faf9f6] text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white pb-36 sm:pb-40">
      {/* Apple-Level Luxury Toast Notification */}
      <AnimatePresence>
        {state.toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2.5 bg-neutral-950/95 text-white backdrop-blur-xl border border-neutral-800/90 px-5 py-3 rounded-full text-xs font-medium shadow-2xl tracking-wide max-w-[90vw]"
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>{state.toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <MenuHeader
        tableNo={state.tableNumber}
        guestName={state.currentGuestName}
        venueName={state.businessName}
        tagline={menuInfo.tagline}
        activeOrdersCount={state.sentItems.length}
        cartCount={state.totalCartCount}
        onOpenBill={() => goTab('live_order')}
        billRequestedBanner={state.billRequestedBanner}
      />

      <div className="pt-1 pb-2">
        <GuestAccountStrip venueId={venueId} tableNumber={state.tableNumber} />
      </div>

      {state.activeTab === 'menu' && <OfferTicker venueId={venueId} tableNumber={state.tableNumber} />}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-2 pb-36 sm:pb-40">
        {state.activeTab === 'menu' ? (
          <div className="space-y-4 sm:space-y-5">
            <ServiceCallBar
              venueId={cafeParam || state.activeSession?.business_id || ''}
              tableNo={state.tableNumber}
              hasOrderPlaced={state.hasActiveOrder || state.sentItems.length > 0}
              onRequestBill={state.handleRequestBill}
              isRequestingBill={state.isRequestingBill}
              billRequested={state.billRequestedBanner}
            />

            {(state.hasActiveOrder || state.sentItems.length > 0 || (state.billSettled && state.settledTotal > 0)) && (
              <>
                <LiveOrderTracker
                  tableNumber={state.tableNumber}
                  kotStatus={state.kotStatus}
                  orderStatus={state.masterOrder?.status}
                  ticketNumber={state.ticketNumber}
                  items={state.sentItems}
                  runningTotal={state.runningTotal}
                  isAddon={state.isRecentAddon}
                  onViewBill={() => goTab('live_order')}
                  onRequestBill={state.handleRequestBill}
                  isRequestingBill={state.isRequestingBill}
                  billRequested={state.billRequestedBanner}
                  billSettled={state.billSettled && state.settledTotal > 0}
                  settledTotal={state.settledTotal}
                  cashbackCredited={state.cashbackCredited}
                  onExploreServices={() => {
                    state.setShowBeyondDining(true);
                    setTimeout(() => {
                      document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' });
                    }, 150);
                  }}
                  onRefresh={state.handleManualTrackerRefresh}
                  isRefreshing={state.isRefreshingTracker}
                />
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
              </>
            )}

            {likesView && (
              <GuestFavouritesRail
                items={state.diningItems}
                likes={likesView}
                venueName={state.businessName}
                getItemCartQuantity={state.getItemCartQuantity}
                onAdd={state.handleItemIncrement}
              />
            )}

            <DiningFilters
              searchQuery={state.searchQuery}
              setSearchQuery={state.setSearchQuery}
              categories={state.culinaryCategories}
              selectedCategory={state.selectedCategory}
              onSelectCategory={state.setSelectedCategory}
              counts={dishCounts}
              shownCount={state.filteredDiningItems.length}
            />

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

            {state.venueServices.length > 0 && (
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
            onRequestBill={state.handleRequestBill}
            isRequestingBill={state.isRequestingBill}
            onBackToMenu={() => goTab('menu')}
            billRequested={state.billRequestedBanner}
            billSettled={state.billSettled}
            settledTotal={state.settledTotal}
            cashbackCredited={state.cashbackCredited}
            redeemSlot={<BillWalletRedeem cafeId={venueId} tableNumber={state.tableNumber} />}
          />
        )}
      </main>

      {/* Apple-grade Floating Bottom Dock (Unified Stack) */}
      <aside
        aria-label="Guest Floating Controls Dock"
        className="fixed bottom-3 sm:bottom-4 inset-x-0 z-50 flex flex-col items-center gap-2 sm:gap-2.5 px-3 pointer-events-none"
      >
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
        selectedService={state.selectedService}
        onCloseServiceModal={() => state.setSelectedService(null)}
        onRequestService={state.handleConciergeServiceRequest}
        serviceNotificationSent={state.serviceNotificationSent}
        orderCelebration={state.orderCelebration}
        businessName={state.businessName}
        isAddonOrderSuccess={state.isAddonOrderSuccess}
        onCloseOrderCelebration={() => {
          state.setOrderCelebration(false);
          goTab('menu');
          state.setShowBeyondDining(true);
        }}
        onExploreServices={() => {
          state.setOrderCelebration(false);
          goTab('menu');
          state.setShowBeyondDining(true);
          setTimeout(() => {
            document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' });
          }, 150);
        }}
      />
    </div>
  );
}

export default function GuestMenuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
          <div className="h-5 w-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
        </div>
      }
    >
      <GuestMenuContent />
    </Suspense>
  );
}

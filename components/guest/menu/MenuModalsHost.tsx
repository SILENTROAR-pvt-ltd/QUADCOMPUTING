'use client';

import React from 'react';
import { CustomizationDrawer } from './CustomizationDrawer';
import { CartReviewModal } from './CartReviewModal';
import { VenueServiceModal } from './VenueServiceModal';
import { OrderSuccessModal } from './OrderSuccessModal';
import type { GuestMenuState } from './hooks/useGuestMenuState';

interface MenuModalsHostProps {
  state: GuestMenuState;
  /** The venue the QR belongs to (the cart review and the success card need it). */
  cafeId: string;
  featuredIds?: string[];
  onExploreServices: () => void;
  onExploreLounge: () => void;
}

/** Every sheet that opens over the menu: customising a dish, reviewing the tray, a venue service, and the order thank-you. */
export function MenuModalsHost({ state: s, cafeId, featuredIds, onExploreServices, onExploreLounge }: MenuModalsHostProps) {
  return (
    <>
      <CustomizationDrawer
        isOpen={s.isCustomizationOpen}
        onClose={() => { s.setIsCustomizationOpen(false); s.setCustomizingItem(null); }}
        item={s.customizingItem}
        onAddToCart={(configured) => { s.addToCart(configured); s.showToast(`Added ${configured.name} to order`); }}
      />
      <CartReviewModal
        isOpen={s.showCartReview} onClose={() => s.setShowCartReview(false)} tableNumber={s.tableNumber}
        cartItems={s.cartItems} cartSubtotal={s.cartSubtotal} gstAmount={s.gstAmount} cartGrandTotal={s.cartGrandTotal}
        orderCookingNotes={s.orderCookingNotes} onNotesChange={s.setOrderCookingNotes} cafeId={cafeId}
        isSendingToKitchen={s.isSendingToKitchen} onPlaceOrder={s.handlePlaceOrderToKitchen}
        onIncrement={s.incrementQuantity} onDecrement={s.decrementQuantity} onRemove={s.removeFromCart}
        hasActiveOrder={s.hasActiveOrder} roomMode={Boolean(s.roomCode)} menuItems={s.diningItems} featuredIds={featuredIds} onQuickAdd={s.handleQuickAdd}
      />
      <VenueServiceModal service={s.selectedService} onClose={() => s.setSelectedService(null)}
        onRequest={s.handleConciergeServiceRequest} isSent={s.serviceNotificationSent} />
      <OrderSuccessModal
        isOpen={s.orderCelebration} tableNumber={s.tableNumber} businessName={s.businessName}
        isAddon={s.isAddonOrderSuccess} roomCode={s.roomCode || undefined} onClose={() => s.setOrderCelebration(false)}
        onExploreServices={onExploreServices} onExploreLounge={onExploreLounge}
      />
    </>
  );
}

'use client';

import React from 'react';
import type { MenuItem } from '@/components/guest/menu/types';
import { CustomizationDrawer, CustomizableItem } from '@/components/guest/menu/CustomizationDrawer';
import { CartReviewModal } from '@/components/guest/menu/CartReviewModal';
import { VenueServiceModal } from '@/components/guest/menu/VenueServiceModal';
import { OrderSuccessModal } from '@/components/guest/menu/OrderSuccessModal';

interface MenuModalsHostProps {
  isCustomizationOpen: boolean;
  onCloseCustomization: () => void;
  customizingItem: CustomizableItem | null;
  onAddToCart: (configuredItem: any) => void;
  showCartReview: boolean;
  onCloseCartReview: () => void;
  tableNumber: string;
  cartItems: any[];
  cartSubtotal: number;
  gstAmount: number;
  cartGrandTotal: number;
  orderCookingNotes: string;
  onNotesChange: (notes: string) => void;
  guestNameInput: string;
  guestPhoneInput: string;
  guestHandleInput?: string;
  guestAvatarInput?: string;
  onGuestNameChange: (val: string) => void;
  onGuestPhoneChange: (val: string) => void;
  onGuestHandleChange?: (val: string) => void;
  onGuestAvatarChange?: (val: string) => void;
  onSaveProfile?: (profile: { name: string; handle: string; phone: string; avatar: string }) => void;
  cafeId?: string;
  isSendingToKitchen: boolean;
  onPlaceOrder: (overrideName?: string, overridePhone?: string, overrideHandle?: string) => void;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onRemove: (id: string) => void;
  hasActiveOrder: boolean;
  selectedService: MenuItem | null;
  onCloseServiceModal: () => void;
  onRequestService: (s: MenuItem) => void;
  serviceNotificationSent: boolean;
  orderCelebration: boolean;
  businessName: string;
  isAddonOrderSuccess: boolean;
  onCloseOrderCelebration: () => void;
  onExploreServices: () => void;
}

export function MenuModalsHost({
  isCustomizationOpen,
  onCloseCustomization,
  customizingItem,
  onAddToCart,
  showCartReview,
  onCloseCartReview,
  tableNumber,
  cartItems,
  cartSubtotal,
  gstAmount,
  cartGrandTotal,
  orderCookingNotes,
  onNotesChange,
  guestNameInput,
  guestPhoneInput,
  guestHandleInput,
  guestAvatarInput,
  onGuestNameChange,
  onGuestPhoneChange,
  onGuestHandleChange,
  onGuestAvatarChange,
  onSaveProfile,
  cafeId,
  isSendingToKitchen,
  onPlaceOrder,
  onIncrement,
  onDecrement,
  onRemove,
  hasActiveOrder,
  selectedService,
  onCloseServiceModal,
  onRequestService,
  serviceNotificationSent,
  orderCelebration,
  businessName,
  isAddonOrderSuccess,
  onCloseOrderCelebration,
  onExploreServices,
}: MenuModalsHostProps) {
  return (
    <>
      <CustomizationDrawer
        isOpen={isCustomizationOpen}
        onClose={onCloseCustomization}
        item={customizingItem}
        onAddToCart={onAddToCart}
      />

      <CartReviewModal
        isOpen={showCartReview}
        onClose={onCloseCartReview}
        tableNumber={tableNumber}
        cartItems={cartItems}
        cartSubtotal={cartSubtotal}
        gstAmount={gstAmount}
        cartGrandTotal={cartGrandTotal}
        orderCookingNotes={orderCookingNotes}
        onNotesChange={onNotesChange}
        cafeId={cafeId}
        isSendingToKitchen={isSendingToKitchen}
        onPlaceOrder={onPlaceOrder}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
        onRemove={onRemove}
        hasActiveOrder={hasActiveOrder}
      />

      <VenueServiceModal
        service={selectedService}
        onClose={onCloseServiceModal}
        onRequest={onRequestService}
        isSent={serviceNotificationSent}
      />

      <OrderSuccessModal
        isOpen={orderCelebration}
        tableNumber={tableNumber}
        businessName={businessName}
        isAddon={isAddonOrderSuccess}
        onClose={onCloseOrderCelebration}
        onExploreServices={onExploreServices}
      />
    </>
  );
}

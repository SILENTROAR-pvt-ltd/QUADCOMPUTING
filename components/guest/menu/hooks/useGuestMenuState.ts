'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/lib/store/cart.store';
import type { MenuItem } from '@/components/guest/menu/types';
import { useGuestMenuSession } from './useGuestMenuSession';
import { useGuestOrderActions } from './useGuestOrderActions';
import { useGuestMenuUi } from './useGuestMenuUi';
import { useGuestCartHandlers } from './useGuestCartHandlers';
import { useGuestContactInfo } from './useGuestContactInfo';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import { matchesDiet } from '@/lib/guest/diet-filter';

export function useGuestMenuState({ tableParam, cafeParam, roomParam = '' }: { tableParam: string; cafeParam: string; roomParam?: string }) {
  const cart = useCartStore();
  const ui = useGuestMenuUi();
  const contact = useGuestContactInfo();
  const cartHandlers = useGuestCartHandlers({ showToast: ui.showToast, handleOpenCustomization: ui.handleOpenCustomization });
  const sessionData = useGuestMenuSession({ tableParam, cafeParam, roomParam });
  const { bindVenue } = cart;
  // The tray belongs to this venue: dishes left from another venue's menu would only be refused at the kitchen.
  useEffect(() => { if (sessionData.businessId) bindVenue(sessionData.businessId); }, [sessionData.businessId, bindVenue]);

  const orderData = useGuestOrderActions({
    roomCode: roomParam, tableNumber: sessionData.tableNumber, cafeParam, guestId: sessionData.guestId,
    businessId: sessionData.businessId,
    activeSession: sessionData.activeSession, currentGuestName: contact.currentGuestName,
    cartItems: cart.items, clearCart: cart.clearCart, showToast: ui.showToast,
    initialOrder: sessionData.initialOrder, initialItems: sessionData.initialItems,
    initialBillRequested: sessionData.initialBillRequested, initialKotStatus: sessionData.initialKotStatus,
    initialTicketNumber: sessionData.initialTicketNumber,
    initialBillSettled: sessionData.initialBillSettled,
    initialSettledTotal: sessionData.initialSettledTotal,
    initialCashbackCredited: sessionData.initialCashbackCredited,
  });

  const cartSubtotal = Math.round(cart.getSubtotal() * 100) / 100;
  // The diet chips and the search narrow the menu. The category chips scroll to a section and follow the page instead of
  // hiding the rest. dietItems is the menu under the chosen diet alone (the category rail counts from it).
  const dietItems = ui.dietFilter === 'all' ? sessionData.diningItems : sessionData.diningItems.filter((item) => matchesDiet(item, ui.dietFilter));
  const filteredDiningItems = dietItems.filter((item) => {
    if (!ui.searchQuery.trim()) return true;
    const q = ui.searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q));
  });

  const handlePlaceOrderToKitchen = async (overrideName?: string, overridePhone?: string, overrideHandle?: string) => {
    const finalName = overrideName ?? contact.guestNameInput;
    const finalPhone = overridePhone ?? contact.guestPhoneInput;
    const finalHandle = overrideHandle ?? contact.guestHandleInput;

    const notes = ui.orderCookingNotes;
    await orderData.handlePlaceOrder(finalName, finalPhone, notes, (isAddon) => {
      // A small thank-you card opens over the menu (OrderSuccessModal) the moment the guest taps; the order travels meanwhile.
      ui.setShowCartReview(false); ui.setOrderCookingNotes(''); ui.setIsAddonOrderSuccess(isAddon);
      ui.setActiveTab('menu'); ui.setOrderCelebration(true);
    }, finalHandle, () => {
      // Refused or unreachable: the card closes and the review opens again with the dishes and the note put back.
      ui.setOrderCelebration(false); ui.setOrderCookingNotes(notes); ui.setShowCartReview(true);
    });
  };

  // Raises a real SERVICE alert for the host (it used to only show a toast —
  // no request was ever sent, so the venue never heard about it).
  const handleConciergeServiceRequest = async (service: MenuItem) => {
    ui.setServiceNotificationSent(true);
    const result = await apiRequest('/api/guest/call-staff', jsonRequest('POST', {
      venue_id: sessionData.businessId || cafeParam,
      table_number: sessionData.tableNumber,
      type: 'SERVICE',
      message: `${service.name}${service.price ? ` (₹${service.price})` : ''}`,
    }));
    ui.setServiceNotificationSent(false);
    ui.setSelectedService(null);
    ui.showToast(result.ok
      ? `${service.name} is requested. The host will confirm with you shortly.`
      : "Couldn't reach the venue. Please try again, or ask your waiter.");
  };

  return {
    roomCode: roomParam, ...sessionData, ...orderData, ...ui, ...contact, ...cartHandlers,
    cartItems: cart.items, addToCart: cart.addToCart, removeFromCart: cart.removeFromCart,
    incrementQuantity: cart.incrementQuantity, decrementQuantity: cart.decrementQuantity,
    totalCartCount: cart.getTotalCount(), cartSubtotal, gstAmount: 0, cartGrandTotal: cartSubtotal,
    dietItems, filteredDiningItems, handlePlaceOrderToKitchen, handleConciergeServiceRequest,
  };
}

/** Everything the menu page reads and does, as one object. */
export type GuestMenuState = ReturnType<typeof useGuestMenuState>;

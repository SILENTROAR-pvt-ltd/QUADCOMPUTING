'use client';

import { useCartStore } from '@/lib/store/cart.store';
import type { MenuItem } from '@/components/guest/menu/types';
import { useGuestMenuSession } from './useGuestMenuSession';
import { useGuestOrderActions } from './useGuestOrderActions';
import { useGuestMenuUi } from './useGuestMenuUi';
import { useGuestCartHandlers } from './useGuestCartHandlers';
import { useGuestContactInfo } from './useGuestContactInfo';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';

export function useGuestMenuState({ tableParam, cafeParam }: { tableParam: string; cafeParam: string }) {
  const cart = useCartStore();
  const ui = useGuestMenuUi();
  const contact = useGuestContactInfo();
  const cartHandlers = useGuestCartHandlers({ showToast: ui.showToast, handleOpenCustomization: ui.handleOpenCustomization });
  const sessionData = useGuestMenuSession({ tableParam, cafeParam });

  const orderData = useGuestOrderActions({
    tableNumber: sessionData.tableNumber, cafeParam, guestId: sessionData.guestId,
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
  const filteredDiningItems = sessionData.diningItems.filter((item) => {
    if (
      ui.selectedCategory !== 'Dining' &&
      (item.category || '').trim().toLowerCase() !== ui.selectedCategory.trim().toLowerCase()
    ) {
      return false;
    }
    if (!ui.searchQuery.trim()) return true;
    const q = ui.searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q));
  });

  const handlePlaceOrderToKitchen = async (overrideName?: string, overridePhone?: string, overrideHandle?: string) => {
    const finalName = overrideName ?? contact.guestNameInput;
    const finalPhone = overridePhone ?? contact.guestPhoneInput;
    const finalHandle = overrideHandle ?? contact.guestHandleInput;

    await orderData.handlePlaceOrder(finalName, finalPhone, ui.orderCookingNotes, (isAddon) => {
      // A small thank-you card opens over the menu (OrderSuccessModal); the guest chooses what to do while the food is prepared.
      ui.setShowCartReview(false); ui.setOrderCookingNotes(''); ui.setIsAddonOrderSuccess(isAddon);
      ui.setActiveTab('menu'); ui.setOrderCelebration(true);
    }, finalHandle);
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
      ? `Request sent: ${service.name} for Table ${sessionData.tableNumber}`
      : "Couldn't reach the venue. Please try again, or ask your waiter.");
  };

  return {
    ...sessionData, ...orderData, ...ui, ...contact, ...cartHandlers,
    cartItems: cart.items, addToCart: cart.addToCart, removeFromCart: cart.removeFromCart,
    incrementQuantity: cart.incrementQuantity, decrementQuantity: cart.decrementQuantity,
    totalCartCount: cart.getTotalCount(), cartSubtotal, gstAmount: 0, cartGrandTotal: cartSubtotal,
    filteredDiningItems, handlePlaceOrderToKitchen, handleConciergeServiceRequest,
  };
}

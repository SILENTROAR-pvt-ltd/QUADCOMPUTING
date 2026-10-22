'use client';

import { useCartStore } from '@/lib/store/cart.store';
import type { MenuItem } from '@/components/guest/menu/types';
import { QUICK_TOAST_MS } from '@/components/guest/menu/toast-store';

interface CartHandlerProps {
  showToast: (msg: string, durationMs?: number) => void;
  handleOpenCustomization: (item: MenuItem) => void;
}

export function useGuestCartHandlers({ showToast, handleOpenCustomization }: CartHandlerProps) {
  const { items: cartItems, addToCart, incrementQuantity, decrementQuantity } = useCartStore();

  const handleQuickAdd = (item: MenuItem) => {
    addToCart({
      item_id: item.id,
      name: item.name,
      base_price: Number(item.price) || 0,
      quantity: 1,
      selected_addons: [],
      total_item_price: Number(item.price) || 0,
      image_url: item.image_url,
      category: item.category,
    });
    showToast(`Added ${item.name} to order`, QUICK_TOAST_MS);
  };

  const getItemCartQuantity = (itemId: string) => {
    return cartItems.filter((it) => it.item_id === itemId).reduce((sum, it) => sum + it.quantity, 0);
  };

  const handleItemIncrement = (item: MenuItem) => {
    const qty = getItemCartQuantity(item.id);
    const hasOptions = (item.item_options && item.item_options.length > 0) ||
      (item.options && item.options.length > 0) ||
      (item.customization_groups && item.customization_groups.length > 0);

    if (hasOptions && qty === 0) {
      handleOpenCustomization(item);
      return;
    }
    const existing = cartItems.find((c) => c.item_id === item.id);
    if (existing) incrementQuantity(existing.cart_id);
    else handleQuickAdd(item);
  };

  const handleItemDecrement = (item: MenuItem) => {
    const matching = cartItems.filter((c) => c.item_id === item.id);
    if (matching.length > 0) decrementQuantity(matching[matching.length - 1].cart_id);
  };

  return { handleQuickAdd, getItemCartQuantity, handleItemIncrement, handleItemDecrement };
}

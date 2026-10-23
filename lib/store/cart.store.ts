'use client';

import { create } from 'zustand';

export interface CartAddon {
  name: string;
  price: number;
}

export interface CartItem {
  cart_id: string; // Generate a unique UUID/hash on insertion
  item_id: string;
  name: string;
  base_price: number;
  quantity: number;
  selected_addons: CartAddon[];
  total_item_price: number; // base_price + addons_price
  notes?: string;
  image_url?: string;
  category?: string;
}

interface CartStore {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'cart_id'> & { cart_id?: string }) => void;
  removeFromCart: (cart_id: string) => void;
  incrementQuantity: (cart_id: string) => void;
  decrementQuantity: (cart_id: string) => void;
  /** The guest's note for this one dish ("less spicy"), sent to the kitchen under that dish only. */
  setItemNote: (cart_id: string, notes: string) => void;
  clearCart: () => void;
  /** Puts dishes back (an order shown as sent at once that the server then refused), ahead of anything added since. */
  restoreItems: (items: CartItem[]) => void;
  /** Ties the tray to the venue whose menu is open: dishes left from another venue's menu are dropped. */
  bindVenue: (venueId: string) => void;
  getTotalCount: () => number;
  getSubtotal: () => number;
}

function generateCartId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `crt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function areAddonsEqual(a: CartAddon[] = [], b: CartAddon[] = []): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x.name.localeCompare(y.name));
  const sortedB = [...b].sort((x, y) => x.name.localeCompare(y.name));
  return sortedA.every((addon, i) => addon.name === sortedB[i].name && addon.price === sortedB[i].price);
}

/** The venue the stored tray belongs to (a guest who scans another venue's QR starts with an empty tray). */
const CART_VENUE_KEY = 'quad_guest_cart_venue';

function loadInitialCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('quad_guest_cart');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore parsing errors
  }
  return [];
}

function saveCartToStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('quad_guest_cart', JSON.stringify(items));
  } catch {
    // ignore storage quota issues
  }
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: loadInitialCart(),

  addToCart: (incoming) => {
    set((state) => {
      const existingIndex = state.items.findIndex(
        (it) => it.item_id === incoming.item_id && areAddonsEqual(it.selected_addons, incoming.selected_addons)
      );

      let updatedItems: CartItem[];

      const addonsTotal = (incoming.selected_addons || []).reduce((acc, curr) => acc + curr.price, 0);
      const totalItemPrice = Number(incoming.base_price) + addonsTotal;

      if (existingIndex > -1) {
        // Increment quantity of existing customized item
        updatedItems = state.items.map((item, idx) => {
          if (idx === existingIndex) {
            const nextQty = item.quantity + (incoming.quantity || 1);
            return {
              ...item,
              quantity: nextQty,
              total_item_price: totalItemPrice,
              notes: incoming.notes || item.notes,
            };
          }
          return item;
        });
      } else {
        // Insert new distinct cart item with fresh cart_id
        const newItem: CartItem = {
          ...incoming,
          cart_id: incoming.cart_id || generateCartId(),
          quantity: incoming.quantity || 1,
          selected_addons: incoming.selected_addons || [],
          total_item_price: totalItemPrice,
        };
        updatedItems = [...state.items, newItem];
      }

      saveCartToStorage(updatedItems);
      return { items: updatedItems };
    });
  },

  removeFromCart: (cart_id: string) => {
    set((state) => {
      const updatedItems = state.items.filter((it) => it.cart_id !== cart_id);
      saveCartToStorage(updatedItems);
      return { items: updatedItems };
    });
  },

  incrementQuantity: (cart_id: string) => {
    set((state) => {
      const updatedItems = state.items.map((it) => {
        if (it.cart_id === cart_id) {
          return { ...it, quantity: it.quantity + 1 };
        }
        return it;
      });
      saveCartToStorage(updatedItems);
      return { items: updatedItems };
    });
  },

  decrementQuantity: (cart_id: string) => {
    set((state) => {
      const target = state.items.find((it) => it.cart_id === cart_id);
      if (!target) return state;

      let updatedItems: CartItem[];
      if (target.quantity <= 1) {
        updatedItems = state.items.filter((it) => it.cart_id !== cart_id);
      } else {
        updatedItems = state.items.map((it) => {
          if (it.cart_id === cart_id) {
            return { ...it, quantity: it.quantity - 1 };
          }
          return it;
        });
      }

      saveCartToStorage(updatedItems);
      return { items: updatedItems };
    });
  },

  setItemNote: (cart_id: string, notes: string) => {
    set((state) => {
      const clean = notes.slice(0, 120);
      const updatedItems = state.items.map((it) => (it.cart_id === cart_id ? { ...it, notes: clean || undefined } : it));
      saveCartToStorage(updatedItems);
      return { items: updatedItems };
    });
  },

  clearCart: () => {
    saveCartToStorage([]);
    set({ items: [] });
  },

  restoreItems: (restored: CartItem[]) => {
    set((state) => {
      const ids = new Set(restored.map((it) => it.cart_id));
      const updatedItems = [...restored, ...state.items.filter((it) => !ids.has(it.cart_id))];
      saveCartToStorage(updatedItems);
      return { items: updatedItems };
    });
  },

  bindVenue: (venueId: string) => {
    if (!venueId || typeof window === 'undefined') return;
    try {
      const held = localStorage.getItem(CART_VENUE_KEY);
      if (held && held !== venueId) {
        saveCartToStorage([]);
        set({ items: [] });
      }
      localStorage.setItem(CART_VENUE_KEY, venueId);
    } catch {
      // storage unavailable: the tray lives only in memory, so nothing carries over anyway
    }
  },

  getTotalCount: () => {
    return get().items.reduce((total, it) => total + it.quantity, 0);
  },

  getSubtotal: () => {
    return get().items.reduce((total, it) => total + it.total_item_price * it.quantity, 0);
  },
}));

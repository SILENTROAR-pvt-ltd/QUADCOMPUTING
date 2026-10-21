'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CartItem, useCartStore } from '@/lib/store/cart.store';
import { useGuestAccount } from '@/lib/guest/use-guest-account';
import { useGuestWallet } from '@/components/guest/lobby/useGuestWallet';
import { WalletRedeemPass } from '@/components/guest/lobby/wallet/WalletRedeemPass';
import { CartOffers, useOrderOffers } from './CartOffers';
import { CashbackBanner } from './CashbackBanner';
import { CartSuggestions } from './CartSuggestions';
import { useVenueGst } from './MenuInfoPanel';
import { CartLineItem } from './cart/CartLineItem';
import { CartBillSummary } from './cart/CartBillSummary';
import { CartReviewFooter } from './cart/CartReviewFooter';
import { CartReviewHeader } from './cart/CartReviewHeader';
import { CartAuthGate, type AuthReason } from './cart/CartAuthGate';
import type { MenuItem } from './types';
import { cashbackFor } from '@/lib/guest/cashback';
import { DeliveryCheckoutSheet } from '@/components/guest/delivery/DeliveryCheckoutSheet';

interface CartReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber: string;
  cartItems: CartItem[];
  cartSubtotal: number;
  /** Kept so existing callers still type-check: notes are written per dish, and GST is shown as a plain line. */
  gstAmount?: number;
  cartGrandTotal?: number;
  orderCookingNotes?: string;
  onNotesChange?: (notes: string) => void;
  cafeId?: string;
  isSendingToKitchen: boolean;
  /** Identity is passed for compatibility; the server takes it from the guest's signed-in session. */
  onPlaceOrder: (overrideName?: string, overridePhone?: string, overrideHandle?: string) => void;
  onIncrement: (cart_id: string) => void;
  onDecrement: (cart_id: string) => void;
  onRemove: (cart_id: string) => void;
  hasActiveOrder?: boolean;
  /** The menu, for suggesting a drink or something sweet. Without it nothing is suggested. */
  menuItems?: MenuItem[];
  featuredIds?: string[];
  onQuickAdd?: (item: MenuItem) => void;
  /**
   * Room mode: the order is added to the room's bill and brought to the door. Cashback, offers and the Vibers ID sign-in
   * work as at a table (the cashback is credited when the stay checks out); a wallet code cannot be redeemed against a
   * room bill, and there is no delivery alternative.
   */
  roomMode?: boolean;
}

/** The order review: every dish with its note, suggestions, wallet and offers, the bill, and Place order. */
export const CartReviewModal: React.FC<CartReviewModalProps> = (p) => {
  const { isOpen, onClose, tableNumber, cartItems, cartSubtotal, cafeId = '', hasActiveOrder = false, menuItems = [], featuredIds = [] } = p;
  // Account, wallet and offers load with the menu (this component stays mounted), so the sheet opens complete.
  const { account, refresh } = useGuestAccount(cafeId);
  const { wallet } = useGuestWallet(cafeId);
  const offers = useOrderOffers(cafeId);
  const gstApplicable = useVenueGst(cafeId);
  const setItemNote = useCartStore((s) => s.setItemNote);
  const [authFor, setAuthFor] = useState<AuthReason>(null);
  const [deliveryOpen, setDeliveryOpen] = useState(false);

  const cashback = cashbackFor(cartSubtotal);
  const itemCount = cartItems.reduce((n, i) => n + i.quantity, 0);
  const balance = Number(wallet.balance || 0);

  useEffect(() => {
    if (!isOpen || authFor) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, authFor, onClose]);

  // Signed in: the order goes out under the verified account. Otherwise sign in (or continue without) first.
  const room = Boolean(p.roomMode);
  const place = () => (account ? p.onPlaceOrder(account.display_name, undefined, account.handle) : setAuthFor('order'));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div key="cart-review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4">
          <motion.div role="dialog" aria-modal="true" aria-labelledby="cart-review-title"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border-t border-zinc-200 bg-white p-5 pb-[calc(env(safe-area-inset-bottom,16px)+1.25rem)] shadow-2xl will-change-transform sm:rounded-3xl sm:border sm:p-7">
            <CartReviewHeader tableNumber={tableNumber} itemCount={itemCount} hasActiveOrder={hasActiveOrder} onClose={onClose} />

            {/* Everything between the header and Place order scrolls together, so a short phone never squeezes the dishes. */}
            <div className="-mx-1 flex-1 overflow-y-auto overscroll-contain px-1 pb-2">
              <CashbackBanner amount={cashback} account={account} walletBalance={balance} onSignIn={() => setAuthFor('claim')} />
              <div className="mt-5 divide-y divide-zinc-100">
                <AnimatePresence initial={false}>
                  {cartItems.map((item) => (
                    <motion.div key={item.cart_id} layout="position" exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}>
                      <CartLineItem item={item} onIncrement={p.onIncrement} onDecrement={p.onDecrement} onRemove={p.onRemove} onNote={setItemNote} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              {p.onQuickAdd && menuItems.length > 0 && <CartSuggestions cartItems={cartItems} menuItems={menuItems} featuredIds={featuredIds} onAdd={p.onQuickAdd} />}
              {account && !room && (
                <div className="pt-3">
                  <WalletRedeemPass balance={balance} guestId={account.handle} guestHandle={account.handle} walletCode={wallet.wallet_code} tableNumber={tableNumber} cafeId={cafeId} />
                </div>
              )}
              <CartOffers venueId={cafeId} tableNumber={tableNumber} offers={offers} />
              <CartBillSummary subtotal={cartSubtotal} cashback={cashback} signedIn={Boolean(account)} gstApplicable={room ? false : gstApplicable} />
              {room && <p className="mt-3 rounded-xl bg-zinc-50 px-3.5 py-2.5 text-xs leading-relaxed text-zinc-600">Brought to your door and added to your room bill. Nothing to pay now; you settle it at checkout, and your cashback is credited then.</p>}
            </div>

            {cafeId && !hasActiveOrder && !room && (
              <button type="button" onClick={() => setDeliveryOpen(true)} disabled={cartItems.length === 0 || p.isSendingToKitchen}
                className="mb-3 h-10 w-full cursor-pointer rounded-2xl border border-zinc-200 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-800 hover:bg-zinc-50 disabled:opacity-40">
                Order for delivery instead
              </button>
            )}
            <CartReviewFooter total={cartSubtotal} sending={p.isSendingToKitchen} disabled={cartItems.length === 0} hasActiveOrder={hasActiveOrder} roomMode={room} onPlace={place} />
          </motion.div>

          <CartAuthGate reason={authFor} venueId={cafeId} tableNumber={tableNumber} onClose={() => setAuthFor(null)} onPlace={p.onPlaceOrder} onSignedIn={() => void refresh()} />
          <DeliveryCheckoutSheet isOpen={deliveryOpen} onClose={() => setDeliveryOpen(false)} cafeId={cafeId}
            cartItems={cartItems} subtotal={cartSubtotal} onPlaced={() => { setDeliveryOpen(false); onClose(); }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

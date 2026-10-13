'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, ArrowRight, PencilLine } from 'lucide-react';
import { CartItem, useCartStore } from '@/lib/store/cart.store';
import { useGuestAccount } from '@/lib/guest/use-guest-account';
import { useGuestWallet } from '@/components/guest/lobby/useGuestWallet';
import { WalletRedeemPass } from '@/components/guest/lobby/wallet/WalletRedeemPass';
import { GuestAuthSheet } from '@/components/guest/account/GuestAuthSheet';
import { CartOffers, useOrderOffers } from '@/components/guest/menu/CartOffers';
import { CashbackBanner } from '@/components/guest/menu/CashbackBanner';
import { CASHBACK_PERCENT, cashbackFor, rupees } from '@/lib/guest/cashback';

interface CartReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber: string;
  cartItems: CartItem[];
  cartSubtotal: number;
  gstAmount?: number;
  cartGrandTotal?: number;
  /** No longer shown: notes are written per dish, under each dish. Kept so existing callers still type-check. */
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
}

// The sheet rises like a native one: a short, decelerating slide with no spring to settle.
const sheetEase = [0.32, 0.72, 0, 1] as const;
const stepBtn = 'grid h-8 w-8 place-items-center rounded-full text-zinc-600 transition-colors hover:text-zinc-950 active:bg-zinc-200/80 cursor-pointer';
const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

/** The dish's photo, as on the menu card, or its initial when it has none. */
function DishThumb({ src, name }: { src?: string; name: string }) {
  return (
    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-black/5">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- the venue's own dish photo, already sized for the menu
        <img src={src} alt={name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden className="grid h-full w-full place-items-center text-lg text-zinc-400" style={serif}>
          {name.charAt(0)}
        </span>
      )}
    </span>
  );
}

export const CartReviewModal: React.FC<CartReviewModalProps> = ({
  isOpen,
  onClose,
  tableNumber,
  cartItems,
  cartSubtotal,
  cafeId = '',
  isSendingToKitchen,
  onPlaceOrder,
  onIncrement,
  onDecrement,
  onRemove,
  hasActiveOrder = false,
}) => {
  // Account, wallet and offers load with the menu (this component stays mounted), so the sheet opens complete.
  const { account, refresh } = useGuestAccount(cafeId);
  const { wallet } = useGuestWallet(cafeId);
  const offers = useOrderOffers(cafeId);
  const setItemNote = useCartStore((s) => s.setItemNote);
  // Why sign-in is open: to claim cashback (stay on the review) or to place the order (send it once signed in).
  const [authFor, setAuthFor] = useState<'claim' | 'order' | null>(null);

  const cashbackAmount = cashbackFor(cartSubtotal);
  const itemCount = cartItems.reduce((n, i) => n + i.quantity, 0);

  useEffect(() => {
    if (!isOpen || authFor) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, authFor, onClose]);

  // Signed in: the order goes out under the verified account and cashback follows it.
  // Not signed in: the guest signs in or creates an account first (or continues without one), then the order is placed.
  const handleAttemptPlaceOrder = () => {
    if (account) {
      onPlaceOrder(account.display_name, undefined, account.handle);
    } else {
      setAuthFor('order');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="cart-review"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-4"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-review-title"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: sheetEase }}
            className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] border-t border-zinc-200 bg-white p-5 pb-[calc(env(safe-area-inset-bottom,16px)+1.25rem)] shadow-2xl will-change-transform sm:rounded-3xl sm:border sm:p-7"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3.5 shrink-0">
              <div>
                <h3 id="cart-review-title" className="font-editorial text-2xl font-normal text-zinc-950">Review Order</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Table {tableNumber} · {itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer"
                aria-label="Close review"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Everything between the header and the Place order button scrolls together, so on a short phone the
                dishes are never squeezed into a sliver. The cashback banner comes first, the first thing seen. */}
            <div className="-mx-1 flex-1 overflow-y-auto overscroll-contain px-1 pb-2">
              <CashbackBanner
                amount={cashbackAmount}
                account={account}
                walletBalance={Number(wallet.balance || 0)}
                onSignIn={() => setAuthFor('claim')}
              />

              {hasActiveOrder && (
                <div className="mt-3 rounded-xl border border-zinc-200/80 bg-zinc-50/90 p-2.5 flex items-start gap-2.5 text-xs text-zinc-800">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-600 mt-1 animate-pulse shrink-0" />
                  <div className="leading-snug">
                    <span className="font-semibold text-zinc-950">Active order running for Table {tableNumber}.</span>{' '}
                    <span className="text-zinc-500 font-normal">New items will be appended to the current bill.</span>
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="mt-1 divide-y divide-zinc-100">
                {cartItems.map((cartItem) => (
                  <div key={cartItem.cart_id} className="py-3 space-y-1.5">
                    <div className="flex items-start gap-3">
                      <DishThumb src={cartItem.image_url} name={cartItem.name} />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[17px] font-semibold leading-snug tracking-tight text-zinc-900" style={serif}>{cartItem.name}</h4>
                        <div className="text-xs text-zinc-500 mt-0.5">{rupees(cartItem.total_item_price)} each</div>

                        {cartItem.selected_addons.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {cartItem.selected_addons.map((addon, aIdx) => (
                              <span key={aIdx} className="inline-flex items-center text-[10px] font-medium bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md">
                                + {addon.name} ({rupees(addon.price)})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-950">{rupees(cartItem.total_item_price * cartItem.quantity)}</span>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onRemove(cartItem.cart_id)}
                        className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
                        aria-label={`Remove ${cartItem.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <div className="flex items-center rounded-full border border-zinc-200 bg-zinc-50">
                        <button type="button" onClick={() => onDecrement(cartItem.cart_id)} className={stepBtn} aria-label={`One less ${cartItem.name}`}>
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold tabular-nums text-zinc-900">{cartItem.quantity}</span>
                        <button type="button" onClick={() => onIncrement(cartItem.cart_id)} className={stepBtn} aria-label={`One more ${cartItem.name}`}>
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* This dish's own note: it goes to the kitchen under this dish only. */}
                    <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 focus-within:border-zinc-900 focus-within:bg-white transition-colors">
                      <PencilLine className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
                      <span className="sr-only">Note for {cartItem.name}</span>
                      <input
                        type="text"
                        value={cartItem.notes || ''}
                        onChange={(e) => setItemNote(cartItem.cart_id, e.target.value)}
                        maxLength={120}
                        placeholder="Note for this dish, e.g. less spicy"
                        className="h-9 w-full bg-transparent text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                      />
                    </label>
                  </div>
                ))}
              </div>

              {account && (
                <div className="pt-3">
                  <WalletRedeemPass
                    balance={Number(wallet.balance || 0)}
                    guestId={account.handle}
                    guestHandle={account.handle}
                    walletCode={wallet.wallet_code}
                    tableNumber={tableNumber}
                    cafeId={cafeId}
                  />
                </div>
              )}

              <CartOffers venueId={cafeId} tableNumber={tableNumber} offers={offers} />

              {/* The bill */}
              <div className="mt-3 space-y-1.5 border-t border-zinc-100 pt-3 text-xs text-zinc-600">
                <div className="flex justify-between items-center">
                  <span>Subtotal</span>
                  <span className="font-medium tabular-nums text-zinc-900">{rupees(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>{account ? 'Cashback to your wallet' : 'Cashback when you sign in'} ({CASHBACK_PERCENT}%)</span>
                  <span className={`font-semibold tabular-nums ${account ? 'text-emerald-700' : 'text-zinc-900'}`}>+{rupees(cashbackAmount)}</span>
                </div>
                <p className="text-[11px] text-neutral-500 font-light pt-0.5 leading-relaxed">
                  If the venue is GST-registered, GST (5% on food, 18% on services) is added to your bill.
                </p>
              </div>
            </div>

            {/* Total and Place order, always in reach */}
            <div className="border-t border-zinc-100 pt-3 space-y-3 shrink-0">
              <div className="flex justify-between items-center text-base font-bold text-zinc-950">
                <span>Grand total</span>
                <span className="tabular-nums">{rupees(cartSubtotal)}</span>
              </div>

              <button
                type="button"
                onClick={handleAttemptPlaceOrder}
                disabled={isSendingToKitchen || cartItems.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 py-3.5 text-xs font-semibold uppercase tracking-[0.15em] text-white shadow-[0_12px_24px_-12px_rgba(0,0,0,0.7)] transition-colors hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                {isSendingToKitchen ? (
                  <>
                    <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    <span>{hasActiveOrder ? 'Adding to your bill…' : 'Sending to kitchen…'}</span>
                  </>
                ) : (
                  <>
                    <span>{hasActiveOrder ? 'Add to existing bill' : 'Place order to kitchen'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>

          <GuestAuthSheet
            isOpen={authFor !== null}
            venueId={cafeId}
            tableNumber={tableNumber}
            onClose={() => setAuthFor(null)}
            onBrowse={authFor === 'order' ? () => { setAuthFor(null); onPlaceOrder('', undefined, undefined); } : undefined}
            onSignedIn={(signed) => {
              const placeNow = authFor === 'order';
              setAuthFor(null);
              void refresh();
              // Signing in from "Place order" sends the order straight away; signing in to claim cashback only claims it.
              if (placeNow) onPlaceOrder(signed.display_name, undefined, signed.handle);
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

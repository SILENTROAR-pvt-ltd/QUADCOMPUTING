'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import { CartItem } from '@/lib/store/cart.store';
import { useGuestAccount } from '@/lib/guest/use-guest-account';
import { useGuestWallet } from '@/components/guest/lobby/useGuestWallet';
import { WalletRedeemPass } from '@/components/guest/lobby/wallet/WalletRedeemPass';
import { GuestAuthSheet } from '@/components/guest/account/GuestAuthSheet';
import { CartOffers } from '@/components/guest/menu/CartOffers';

interface CartReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber: string;
  cartItems: CartItem[];
  cartSubtotal: number;
  gstAmount?: number;
  cartGrandTotal?: number;
  orderCookingNotes: string;
  onNotesChange: (notes: string) => void;
  cafeId?: string;
  isSendingToKitchen: boolean;
  /** Identity is passed for compatibility; the server takes it from the guest's signed-in session. */
  onPlaceOrder: (overrideName?: string, overridePhone?: string, overrideHandle?: string) => void;
  onIncrement: (cart_id: string) => void;
  onDecrement: (cart_id: string) => void;
  onRemove: (cart_id: string) => void;
  hasActiveOrder?: boolean;
}

export const CartReviewModal: React.FC<CartReviewModalProps> = ({
  isOpen,
  onClose,
  tableNumber,
  cartItems,
  cartSubtotal,
  orderCookingNotes,
  onNotesChange,
  cafeId = '',
  isSendingToKitchen,
  onPlaceOrder,
  onIncrement,
  onDecrement,
  onRemove,
  hasActiveOrder = false,
}) => {
  const { account } = useGuestAccount(cafeId);
  const { wallet } = useGuestWallet(cafeId);
  const [showAuth, setShowAuth] = useState(false);

  const cashbackAmount = Math.round(cartSubtotal * 0.07);
  const subtotalLabel = Number(cartSubtotal).toFixed(cartSubtotal % 1 === 0 ? 0 : 2);

  // Signed in: the order goes out under the verified account and cashback follows it.
  // Not signed in: the guest signs in or creates an account first, then the order is placed.
  const handleAttemptPlaceOrder = () => {
    if (account) {
      onPlaceOrder(account.display_name, undefined, account.handle);
    } else {
      setShowAuth(true);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-full max-w-lg rounded-t-[32px] sm:rounded-3xl bg-white p-5 sm:p-7 border-t sm:border border-zinc-200 shadow-2xl max-h-[90dvh] flex flex-col justify-between pb-[calc(env(safe-area-inset-bottom,16px)+1.5rem)] overflow-hidden relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3.5 shrink-0">
              <div>
                <h3 className="font-editorial text-2xl font-normal text-zinc-950">Review Order</h3>
                <p className="text-xs text-zinc-400 font-light mt-0.5">Table {tableNumber}</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-black transition-colors cursor-pointer"
                aria-label="Close review"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {hasActiveOrder && (
              <div className="mt-3 mb-1 rounded-xl border border-zinc-200/80 bg-zinc-50/90 p-2.5 flex items-start gap-2.5 text-xs text-zinc-800 shrink-0">
                <span className="flex h-2 w-2 rounded-full bg-emerald-600 mt-1 animate-pulse shrink-0" />
                <div className="leading-snug">
                  <span className="font-semibold text-zinc-950">Active order running for Table {tableNumber}.</span>{' '}
                  <span className="text-zinc-500 font-normal">New items will be appended to the current bill.</span>
                </div>
              </div>
            )}

            {/* Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 my-3 pr-1 space-y-1">
              {cartItems.map((cartItem) => (
                <div key={cartItem.cart_id} className="py-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif text-base font-semibold text-zinc-950">{cartItem.name}</h4>
                      <div className="text-xs text-zinc-500 font-mono mt-0.5">Base: ₹{cartItem.base_price}</div>

                      {cartItem.selected_addons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {cartItem.selected_addons.map((addon, aIdx) => (
                            <span key={aIdx} className="inline-flex items-center text-[10px] font-medium bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md">
                              + {addon.name} (₹{addon.price})
                            </span>
                          ))}
                        </div>
                      )}

                      {cartItem.notes && (
                        <p className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1 mt-2 inline-block">
                          Note: {cartItem.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="font-mono text-sm font-bold text-zinc-950">₹{cartItem.total_item_price * cartItem.quantity}</span>
                      <button onClick={() => onRemove(cartItem.cart_id)} className="text-zinc-400 hover:text-red-500 p-1 transition-colors cursor-pointer" title="Remove item">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-1">
                    <div className="flex items-center gap-2 border border-zinc-200 rounded-full px-2.5 py-0.5 bg-zinc-50">
                      <button onClick={() => onDecrement(cartItem.cart_id)} className="text-zinc-500 hover:text-black cursor-pointer p-0.5" aria-label="Decrease quantity">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="font-semibold text-xs text-zinc-900 w-4 text-center">{cartItem.quantity}</span>
                      <button onClick={() => onIncrement(cartItem.cart_id)} className="text-zinc-500 hover:text-black cursor-pointer p-0.5" aria-label="Increase quantity">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Guest account / wallet */}
              <div className="pt-3 pb-1 border-t border-zinc-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Your account</span>
                  <span className="text-[10px] text-amber-600 font-medium">7% cashback</span>
                </div>
                {account ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#e8e2d5] bg-white text-lg">
                      {account.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={account.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        account.avatar
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-950 truncate">
                        {account.display_name} <span className="text-zinc-500 font-normal">· {account.handle}</span>
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <ShieldCheck className="h-3 w-3" /> Wallet active
                      </p>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-emerald-800 shrink-0">+₹{cashbackAmount}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5">
                    <p className="text-xs text-zinc-600 leading-snug">Sign in to earn <span className="font-semibold text-zinc-900">₹{cashbackAmount}</span> cashback on this order.</p>
                    <button type="button" onClick={() => setShowAuth(true)} className="shrink-0 rounded-xl bg-zinc-950 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800 cursor-pointer">
                      Sign in
                    </button>
                  </div>
                )}
              </div>

              {account && (
                <WalletRedeemPass
                  balance={Number(wallet.balance || 0)}
                  guestId={account.handle}
                  guestHandle={account.handle}
                  walletCode={wallet.wallet_code}
                  tableNumber={tableNumber}
                  cafeId={cafeId}
                />
              )}

              <CartOffers venueId={cafeId} tableNumber={tableNumber} />

              <div className="pt-2 pb-1">
                <label htmlFor="kitchen-note" className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Table note for kitchen</label>
                <input
                  id="kitchen-note"
                  type="text"
                  value={orderCookingNotes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder="e.g. Serve starters first, bring extra cutlery..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Totals */}
            <div className="border-t border-zinc-100 pt-3.5 space-y-3 shrink-0">
              <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 px-3.5 py-2.5 flex items-center justify-between text-xs shadow-xs">
                <div className="flex items-center gap-2 text-amber-950 font-medium">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-xs font-medium text-amber-900">
                    {account ? 'Credited to your wallet when the bill settles' : 'Sign in to get this back as cashback'}
                  </span>
                </div>
                <span className="font-mono text-[11px] font-bold text-amber-800 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full shrink-0">+₹{cashbackAmount}</span>
              </div>

              <div className="space-y-1.5 text-xs text-zinc-600">
                <div className="flex justify-between items-center">
                  <span>Subtotal</span>
                  <span className="font-sans font-medium text-zinc-900">₹{subtotalLabel}</span>
                </div>
                <div className="flex justify-between items-center text-base font-bold text-zinc-950 pt-2 border-t border-zinc-100">
                  <span>Grand total</span>
                  <span className="font-sans font-bold">₹{subtotalLabel}</span>
                </div>
                <p className="text-[11px] text-neutral-500 font-light pt-0.5 leading-relaxed">
                  If the venue is GST-registered, GST (5% on food, 18% on services) is added to your bill.
                </p>
              </div>

              <button
                onClick={handleAttemptPlaceOrder}
                disabled={isSendingToKitchen || cartItems.length === 0}
                className="w-full rounded-2xl bg-zinc-950 py-3.5 text-xs font-semibold uppercase tracking-[0.15em] text-white hover:bg-zinc-800 transition-all disabled:opacity-50 cursor-pointer shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isSendingToKitchen ? (
                  <span>{hasActiveOrder ? 'Appending to existing bill…' : 'Sending to kitchen…'}</span>
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
            isOpen={showAuth}
            venueId={cafeId}
            tableNumber={tableNumber}
            onClose={() => setShowAuth(false)}
            onBrowse={() => { setShowAuth(false); onPlaceOrder('', undefined, undefined); }}
            onSignedIn={(signed) => {
              setShowAuth(false);
              // The account is verified and the session cookie is set: place the order under it now.
              onPlaceOrder(signed.display_name, undefined, signed.handle);
            }}
          />
        </div>
      )}
    </AnimatePresence>
  );
};

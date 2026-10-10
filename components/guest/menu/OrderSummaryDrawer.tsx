'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Plus, Minus, UtensilsCrossed, MessageSquare } from 'lucide-react';
import { CartItem } from '@/lib/store/cart.store';

export interface OrderSummaryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[] | any[];
  onUpdateQty?: (id: string, qty: number) => void;
  onIncrement?: (id: string) => void;
  onDecrement?: (id: string) => void;
  onRemove?: (id: string) => void;
  onPlaceOrder: () => void;
  subtotal?: number;
  tax?: number;
  grandTotal?: number;
  // Aliases for compatibility
  cartSubtotal?: number;
  gstAmount?: number;
  cartGrandTotal?: number;
  tableNo?: string;
  tableNumber?: string;
  isSendingToKitchen?: boolean;
  orderCookingNotes?: string;
  onNotesChange?: (notes: string) => void;
  guestName?: string;
  guestPhone?: string;
  onGuestNameChange?: (name: string) => void;
  onGuestPhoneChange?: (phone: string) => void;
}

export function OrderSummaryDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQty,
  onIncrement,
  onDecrement,
  onRemove,
  onPlaceOrder,
  subtotal,
  tax,
  grandTotal,
  cartSubtotal,
  gstAmount,
  cartGrandTotal,
  tableNo,
  tableNumber,
  isSendingToKitchen = false,
  orderCookingNotes = '',
  onNotesChange,
}: OrderSummaryDrawerProps) {
  const [showNotes, setShowNotes] = useState(false);

  if (!isOpen) return null;

  const displayTable = tableNo || tableNumber || 'T-05';
  const effectiveSubtotal = subtotal ?? cartSubtotal ?? 0;
  const effectiveTax = tax ?? gstAmount ?? Math.round(effectiveSubtotal * 0.05);
  const effectiveGrandTotal = grandTotal ?? cartGrandTotal ?? effectiveSubtotal + effectiveTax;

  const handleUpdate = (item: any, newQty: number) => {
    const itemId = item.cart_id || item.id;
    if (onUpdateQty) {
      onUpdateQty(itemId, newQty);
    } else {
      if (newQty <= 0) {
        if (onRemove) onRemove(itemId);
      } else if (newQty > item.quantity) {
        if (onIncrement) onIncrement(itemId);
      } else {
        if (onDecrement) onDecrement(itemId);
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
        {/* Backdrop click to dismiss */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-lg bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/70 shrink-0">
            <div>
              <h2
                className="text-lg font-serif font-bold text-zinc-900 tracking-tight"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Review Order
              </h2>
              <p className="text-[11px] text-zinc-500 font-medium">
                Table {displayTable} &middot; Executive Kitchen Dispatch
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-zinc-200/60 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-3 divide-y divide-zinc-100">
            {cartItems.length === 0 ? (
              <div className="py-12 text-center text-zinc-400">
                <UtensilsCrossed size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">Your order tray is empty</p>
                <p className="text-xs text-zinc-400 mt-1">Add items from the menu to continue</p>
              </div>
            ) : (
              cartItems.map((item: any) => {
                const itemId = item.cart_id || item.id;
                const itemBasePrice = item.price ?? item.base_price ?? 0;
                const itemTotal = itemBasePrice * item.quantity;
                const hasAddons = item.selected_addons && item.selected_addons.length > 0;

                return (
                  <div key={itemId} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4
                        className="text-sm font-semibold text-zinc-900 truncate"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      >
                        {item.name}
                      </h4>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5">₹{itemBasePrice}</p>

                      {item.selected_portion && (
                        <span className="text-[10px] text-zinc-500 block">
                          Size: {item.selected_portion.name}
                        </span>
                      )}

                      {hasAddons && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.selected_addons.map((addon: any, idx: number) => (
                            <span
                              key={idx}
                              className="text-[9px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded font-medium"
                            >
                              +{addon.name} (₹{addon.price})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center gap-1.5 bg-zinc-100 border border-zinc-200/80 rounded-full px-2 py-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdate(item, item.quantity - 1)}
                        className="p-1 hover:bg-white rounded-full text-zinc-700 transition-colors cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="text-red-500" size={12} />
                        ) : (
                          <Minus size={12} />
                        )}
                      </button>
                      <span className="text-xs font-bold text-zinc-900 min-w-[16px] text-center font-mono">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdate(item, item.quantity + 1)}
                        className="p-1 hover:bg-white rounded-full text-zinc-700 transition-colors cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <span className="text-sm font-bold text-zinc-900 w-16 text-right font-mono shrink-0">
                      ₹{itemTotal}
                    </span>
                  </div>
                );
              })
            )}

            {/* Optional Kitchen Notes Input Toggle */}
            {cartItems.length > 0 && onNotesChange && (
              <div className="pt-3 pb-1">
                {!showNotes && !orderCookingNotes ? (
                  <button
                    type="button"
                    onClick={() => setShowNotes(true)}
                    className="text-[11px] text-zinc-500 hover:text-zinc-800 font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <MessageSquare size={13} />
                    <span>Add special instructions for chef</span>
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-zinc-500 font-medium block">
                      Chef Cooking Notes (allergies, spice level):
                    </label>
                    <input
                      type="text"
                      value={orderCookingNotes}
                      onChange={(e) => onNotesChange(e.target.value)}
                      placeholder="e.g. Less spicy, no onions, gluten allergy..."
                      className="w-full text-xs px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bill Breakdown & CTA */}
          <div className="p-5 sm:p-6 bg-zinc-50/90 border-t border-zinc-100 space-y-3 shrink-0">
            <div className="space-y-1.5 text-xs text-zinc-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono font-medium">₹{effectiveSubtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes & GST (5%)</span>
                <span className="font-mono font-medium">₹{effectiveTax}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-zinc-900 pt-2 border-t border-zinc-200">
                <span>Grand Total</span>
                <span className="font-mono">₹{effectiveGrandTotal}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={cartItems.length === 0 || isSendingToKitchen}
              onClick={onPlaceOrder}
              className="w-full py-3.5 bg-[#0A3222] hover:bg-[#072418] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] text-white font-medium text-xs sm:text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer uppercase tracking-wider"
            >
              <UtensilsCrossed size={16} />
              <span>{isSendingToKitchen ? 'Transmitting to Kitchen...' : 'PLACE ORDER TO KITCHEN →'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

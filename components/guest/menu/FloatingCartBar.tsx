'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight, ChevronUp, X } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart.store';

export interface FloatingCartBarProps {
  totalCartCount?: number;
  cartSubtotal?: number;
  tableNumber?: string;
  sentItemsCount?: number;
  runningTotal?: number;
  activeTab?: 'menu' | 'live_order' | 'me';
  onOpenCartReview: () => void;
  onToggleTab?: () => void;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({
  totalCartCount: propCount,
  cartSubtotal: propSubtotal,
  tableNumber = 'T-01',
  sentItemsCount = 0,
  runningTotal = 0,
  activeTab = 'menu',
  onOpenCartReview,
  onToggleTab,
}) => {
  // Direct synchronization with Zustand store
  const storeItems = useCartStore((state) => state.items);
  const storeTotalCount = useCartStore((state) => state.getTotalCount());
  const storeSubtotal = useCartStore((state) => state.getSubtotal());

  const count = propCount !== undefined ? propCount : storeTotalCount;
  const subtotal = propSubtotal !== undefined ? propSubtotal : storeSubtotal;

  const latestItem = storeItems.length > 0 ? storeItems[storeItems.length - 1] : null;

  // View Items Popover State
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close popover when clicking outside
  useEffect(() => {
    if (!isPopoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPopoverOpen]);

  // Close popover if cart becomes empty
  useEffect(() => {
    if (count === 0 && isPopoverOpen) {
      setIsPopoverOpen(false);
    }
  }, [count, isPopoverOpen]);

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          key="floating-cart-active"
          initial={{ y: 20, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="w-full max-w-md pointer-events-none"
        >
          {/* Apple-grade glassmorphism dropup/popover for Cart Items preview */}
          <AnimatePresence>
            {isPopoverOpen && (
              <motion.div
                ref={popoverRef}
                initial={{ opacity: 0, y: 15, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.96 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="pointer-events-auto mb-2.5 w-full rounded-2xl bg-black/85 backdrop-blur-xl border border-white/10 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-white max-h-72 flex flex-col overflow-hidden"
              >
                {/* Popover Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-white/10 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
                      Cart Items
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 font-mono">
                      {count} {count === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPopoverOpen(false)}
                    className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label="Close items preview"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Scrollable List of Items */}
                <div className="flex-1 overflow-y-auto divide-y divide-white/5 my-2 pr-1 space-y-0.5 max-h-40">
                  {storeItems.map((item) => (
                    <div key={item.cart_id} className="py-2 flex items-center justify-between gap-3 text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-bold text-neutral-400 shrink-0">
                            {item.quantity}×
                          </span>
                          <span className="font-medium text-neutral-100 truncate">
                            {item.name}
                          </span>
                        </div>
                        {item.selected_addons && item.selected_addons.length > 0 && (
                          <p className="text-[10px] text-neutral-400 font-light truncate pl-4 mt-0.5">
                            + {item.selected_addons.map(a => a.name).join(', ')}
                          </p>
                        )}
                      </div>
                      <span className="font-mono font-semibold text-white shrink-0">
                        ₹{(item.total_item_price * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Popover Footer with Subtotal & Action */}
                <div className="pt-2.5 border-t border-white/10 flex items-center justify-between shrink-0">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-light block">Subtotal</span>
                    <span className="text-sm font-bold text-white font-mono">
                      ₹{subtotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPopoverOpen(false);
                      onOpenCartReview();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-neutral-950 hover:bg-neutral-200 text-[11px] font-semibold transition-all active:scale-95 cursor-pointer shadow-sm"
                  >
                    <span>Review Order</span>
                    <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pure Apple-Level Monochrome Obsidian Container - Compact */}
          <div className="pointer-events-auto relative w-full backdrop-blur-xl bg-black/80 text-white border border-white/10 rounded-2xl py-2 px-3 sm:py-2.5 sm:px-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-2.5 overflow-hidden">
            {/* Subtle Monochrome Hairline Accent */}
            <div className="absolute top-0 inset-x-6 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Left side: Minimalist Icon, Neutral Badge & Crisp Price Hierarchy */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0 shadow-inner backdrop-blur-md">
                <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[2]" />
                {/* Minimalist Live Activity Beacon */}
                <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/70 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                </span>
              </div>

              <div className="flex flex-col min-w-0">
                {/* Crisp Monochrome Item Badge & Micro-preview */}
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/10 border border-white/10 text-[9px] font-sans font-semibold tracking-wider uppercase text-neutral-200">
                    <motion.span
                      key={count}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      {count} {count === 1 ? 'ITEM' : 'ITEMS'}
                    </motion.span>
                  </span>

                  {latestItem && (
                    <motion.span
                      key={latestItem.cart_id + latestItem.quantity}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-[10px] text-neutral-400 font-light truncate max-w-[100px] sm:max-w-[130px] hidden xs:inline"
                    >
                      &bull; {latestItem.name}
                    </motion.span>
                  )}
                </div>

                {/* Crisp White Subtotal Typography */}
                <motion.div
                  key={subtotal}
                  initial={{ opacity: 0.7, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className="flex items-baseline gap-1 mt-0.5"
                >
                  <span className="text-[10px] text-neutral-400 font-light">Subtotal</span>
                  <span className="text-sm sm:text-base font-bold text-white tracking-tight font-sans">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </span>
                </motion.div>
              </div>
            </div>

            {/* Right side: Secondary "View Items" trigger + Apple Signature Solid Matte White CTA Button */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsPopoverOpen(prev => !prev)}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-neutral-200 hover:text-white text-[11px] font-medium transition-all active:scale-95 cursor-pointer shrink-0 backdrop-blur-md shadow-xs"
                aria-label="Toggle items preview"
                title="View items in cart"
              >
                <ChevronUp className={`w-3.5 h-3.5 transition-transform duration-200 ${isPopoverOpen ? 'rotate-180 text-white' : 'text-neutral-400'}`} />
                <span className="text-[10px] tracking-wide whitespace-nowrap">View Items</span>
              </button>

              <button
                onClick={onOpenCartReview}
                className="group relative inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full bg-white text-neutral-950 hover:bg-neutral-100 active:scale-95 text-[11px] font-semibold uppercase tracking-wider transition-all duration-300 ease-out shadow-sm cursor-pointer shrink-0"
              >
                <span className="font-semibold">Checkout</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-300 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingCartBar;

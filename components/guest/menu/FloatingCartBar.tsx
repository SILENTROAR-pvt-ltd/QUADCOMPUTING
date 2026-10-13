'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight, ChevronUp, X } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart.store';
import { cashbackFor, rupees } from '@/lib/guest/cashback';

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

const quick = { duration: 0.2, ease: [0.32, 0.72, 0, 1] as const };

/**
 * The tray bar above the tab bar: what is in the tray, the cashback it earns, and Place order (which opens the review).
 * Tapping the left side lists the dishes. Solid colours and transform-only motion, so it never stutters over the feed.
 */
export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({
  totalCartCount: propCount,
  cartSubtotal: propSubtotal,
  onOpenCartReview,
}) => {
  const storeItems = useCartStore((state) => state.items);
  const storeTotalCount = useCartStore((state) => state.getTotalCount());
  const storeSubtotal = useCartStore((state) => state.getSubtotal());

  const count = propCount !== undefined ? propCount : storeTotalCount;
  const subtotal = propSubtotal !== undefined ? propSubtotal : storeSubtotal;
  const cashback = cashbackFor(subtotal);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close the list on a tap anywhere outside the bar and the list (the toggle itself is inside, so it never reopens).
  useEffect(() => {
    if (!isPopoverOpen) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setIsPopoverOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [isPopoverOpen]);

  useEffect(() => {
    if (count === 0) setIsPopoverOpen(false);
  }, [count]);

  const placeOrder = () => {
    setIsPopoverOpen(false);
    onOpenCartReview();
  };

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          key="floating-cart-active"
          ref={wrapRef}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          transition={quick}
          className="w-full max-w-md pointer-events-none"
        >
          <AnimatePresence>
            {isPopoverOpen && (
              <motion.div
                id="tray-items"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={quick}
                className="pointer-events-auto mb-2 flex max-h-72 w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-4 text-white shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-200">In your tray</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] tabular-nums text-neutral-300">
                      {count} {count === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPopoverOpen(false)}
                    className="grid h-8 w-8 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                    aria-label="Close the tray list"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="my-2 max-h-40 flex-1 divide-y divide-white/5 overflow-y-auto overscroll-contain pr-1">
                  {storeItems.map((item) => (
                    <div key={item.cart_id} className="flex items-center justify-between gap-3 py-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 text-[11px] font-bold tabular-nums text-neutral-400">{item.quantity}×</span>
                          <span className="truncate font-medium text-neutral-100">{item.name}</span>
                        </div>
                        {item.selected_addons && item.selected_addons.length > 0 && (
                          <p className="mt-0.5 truncate pl-4 text-[10px] font-light text-neutral-400">
                            + {item.selected_addons.map((a) => a.name).join(', ')}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums text-white">{rupees(item.total_item_price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-2.5 shrink-0">
                  <div>
                    <span className="block text-[10px] font-light text-neutral-400">Subtotal</span>
                    <span className="text-sm font-bold tabular-nums text-white">{rupees(subtotal)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={placeOrder}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[11px] font-semibold text-zinc-950 transition-colors hover:bg-neutral-200 active:scale-95 cursor-pointer"
                  >
                    Review order <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pointer-events-auto relative flex w-full items-center gap-2 rounded-2xl bg-zinc-950 p-1.5 text-white shadow-[0_18px_40px_-14px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
            <button
              type="button"
              onClick={() => setIsPopoverOpen((open) => !open)}
              aria-expanded={isPopoverOpen}
              aria-controls="tray-items"
              aria-label={`${count} ${count === 1 ? 'item' : 'items'}, ${rupees(subtotal)}. Show what is in your tray`}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1.5 py-1 text-left transition-colors hover:bg-white/[0.06] cursor-pointer"
            >
              <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
                <ShoppingBag className="h-[18px] w-[18px]" aria-hidden />
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-bold tabular-nums text-zinc-950 ring-2 ring-zinc-950">
                  {count}
                </span>
              </span>
              {/* The count is on the bag, so the text is just the total and the cashback it earns. */}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 leading-tight">
                  <span className="text-[15px] font-semibold tabular-nums">{rupees(subtotal)}</span>
                  <ChevronUp aria-hidden className={`h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform duration-200 ${isPopoverOpen ? 'rotate-180' : ''}`} />
                </span>
                {cashback > 0 && (
                  <span className="mt-0.5 block truncate text-[11px] font-medium leading-tight text-zinc-300">
                    {rupees(cashback)} cashback
                  </span>
                )}
              </span>
            </button>

            <button
              type="button"
              onClick={placeOrder}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 text-[13px] font-semibold text-zinc-950 shadow-sm transition-[background-color,transform] duration-150 hover:bg-zinc-200 active:scale-95 cursor-pointer"
            >
              Place order
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingCartBar;

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { ArrowRight, ChevronUp, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart.store';
import { cashbackFor, rupees } from '@/lib/guest/cashback';
import { CART_TARGET_ATTR } from '@/lib/guest/fly-to-cart';
import { AnimatedCount } from './AnimatedCount';
import { TrayPopover } from './cart/TrayPopover';
import { press, SPRING } from './motion';

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

/**
 * The tray bar above the tab bar: what is in the tray, the cashback it earns, and Place order (which opens the review).
 * The bag is where an added dish lands, and it bumps when one does. Tapping the left side lists the dishes.
 */
export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({ totalCartCount: propCount, cartSubtotal: propSubtotal, onOpenCartReview }) => {
  const items = useCartStore((s) => s.items);
  const storeCount = useCartStore((s) => s.getTotalCount());
  const storeSubtotal = useCartStore((s) => s.getSubtotal());
  const count = propCount ?? storeCount;
  const subtotal = propSubtotal ?? storeSubtotal;
  const cashback = cashbackFor(subtotal);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement | null>(null);
  const bag = useAnimationControls();
  const previous = useRef(count);

  // The bag bumps when the count rises: the dish has landed.
  useEffect(() => {
    if (count > previous.current) void bag.start({ scale: [1, 1.22, 1], transition: { duration: 0.32 } });
    previous.current = count;
  }, [count, bag]);

  // Close the list on a tap anywhere outside the bar and the list (the toggle itself is inside, so it never reopens).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);
  useEffect(() => { if (count === 0) setOpen(false); }, [count]);

  const placeOrder = () => { setOpen(false); onOpenCartReview(); };

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div key="tray-bar" ref={wrap} initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 28, opacity: 0 }}
          transition={SPRING} className="pointer-events-none w-full max-w-md">
          <AnimatePresence>
            {open && <TrayPopover items={items} count={count} subtotal={subtotal} onClose={() => setOpen(false)} onReview={placeOrder} />}
          </AnimatePresence>

          <div className="pointer-events-auto relative flex w-full items-center gap-2 rounded-[22px] bg-gradient-to-br from-[#0f2a1e] via-[#143524] to-[#1d4632] p-1.5 text-[#f5f1e8] shadow-[0_20px_44px_-16px_rgba(15,42,30,0.85)] ring-1 ring-[#d9c193]/30">
            <motion.button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="tray-items"
              aria-label={`${count} ${count === 1 ? 'item' : 'items'}, ${rupees(subtotal)}. Show what is in your tray`}
              whileTap={{ scale: 0.97 }} transition={SPRING}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-xl px-1.5 py-1 text-left hover:bg-white/[0.06]">
              <motion.span {...{ [CART_TARGET_ATTR]: '' }} animate={bag} className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 ring-1 ring-[#d9c193]/25">
                <ShoppingBag className="h-[18px] w-[18px] text-[#d9c193]" aria-hidden />
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#fffaf0] px-1 text-[11px] font-bold leading-none text-[#0f2a1e] shadow-[0_2px_6px_rgba(0,0,0,0.35)] ring-2 ring-[#0f2a1e]">
                  <AnimatedCount value={count} />
                </span>
              </motion.span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 leading-tight">
                  <AnimatedCount value={rupees(subtotal)} className="text-[15px] font-semibold" />
                  <ChevronUp aria-hidden className={`h-3.5 w-3.5 shrink-0 text-[#d9c193]/70 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </span>
                {cashback > 0 && (
                  <span className="mt-0.5 block truncate text-[11.5px] leading-tight text-[#f5f1e8]/80">
                    <span className="font-semibold text-[#f3dca6]">{rupees(cashback)}</span> cashback
                  </span>
                )}
              </span>
            </motion.button>

            <motion.button type="button" onClick={placeOrder} {...press}
              className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[#f5f1e8] px-5 text-[13px] font-semibold text-[#0f2a1e] shadow-sm hover:bg-white">
              Place order <ArrowRight className="h-4 w-4" aria-hidden />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingCartBar;

'use client';

import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Camera, Check, Compass, X } from 'lucide-react';

interface OrderSuccessModalProps {
  isOpen: boolean;
  tableNumber: string;
  businessName: string;
  isAddon?: boolean;
  /** Dismiss and stay on the menu. */
  onClose: () => void;
  /** Look at the venue's services while the food is being prepared. */
  onExploreServices: () => void;
  /** Open the lounge, to share a moment while waiting. */
  onExploreLounge: () => void;
}

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };
const ease = [0.16, 1, 0.3, 1] as const;

/**
 * A small, polite card over the menu the moment the kitchen has the order: a thank-you, then two gentle ways to spend the
 * wait. It is not a page. The menu stays visible behind it, and a tap outside or Escape closes it. It only moves the guest
 * between screens; it sends nothing.
 */
export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  isOpen,
  tableNumber,
  businessName,
  isAddon = false,
  onClose,
  onExploreServices,
  onExploreLounge,
}) => {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="order-success"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-zinc-950/40 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:items-center sm:pb-4"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-success-title"
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? false : { opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease }}
            className="relative w-full max-w-[380px] rounded-[26px] border border-neutral-200/80 bg-white p-6 text-center shadow-[0_30px_70px_-24px_rgba(0,0,0,0.5)]"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#0A3222] text-white shadow-[0_12px_26px_-12px_rgba(10,50,34,0.8)]">
              <Check className="h-6 w-6" strokeWidth={2.2} aria-hidden />
            </span>

            <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-400">
              {tableNumber ? `Table ${tableNumber}` : 'Your table'} · {isAddon ? 'Added to your order' : 'Order received'}
            </p>
            <h2 id="order-success-title" className="mt-2 text-[24px] leading-[1.15] text-zinc-950 [text-wrap:balance]" style={serif}>
              Thank you. {isAddon ? 'Your additions have been sent to the kitchen.' : 'Your order has been sent to the kitchen.'}
            </h2>
            <p className="mx-auto mt-2.5 max-w-[300px] text-[13px] leading-relaxed text-zinc-500 [text-wrap:balance]">
              While your food is being prepared, you are welcome to explore what {businessName || 'the venue'} has to offer.
            </p>

            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={onExploreServices}
                className="group flex w-full items-center justify-between gap-3 rounded-2xl bg-zinc-950 px-4 py-3.5 text-left text-white shadow-[0_12px_26px_-14px_rgba(0,0,0,0.6)] transition-colors hover:bg-zinc-800 active:scale-[0.98] cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><Compass className="h-4 w-4" aria-hidden /></span>
                  <span>
                    <span className="block text-[14px] font-medium">Explore venue services</span>
                    <span className="block text-[11.5px] text-white/60">Experiences, stays and more</span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-white/60 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
              </button>

              <button
                type="button"
                onClick={onExploreLounge}
                className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 text-left transition-colors hover:border-neutral-300 active:scale-[0.98] cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-zinc-100 text-zinc-950"><Camera className="h-4 w-4" aria-hidden /></span>
                  <span>
                    <span className="block text-[14px] font-medium text-zinc-950">Explore the lounge</span>
                    <span className="block text-[11.5px] text-zinc-500">Share your moment with other guests</span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OrderSuccessModal;
'use client';

import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Camera, Check, Compass, X } from 'lucide-react';
import { SuccessAction } from './success/SuccessAction';
import { press, SPRING } from './motion';

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

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

/**
 * A small, polite card over the menu the moment the kitchen has the order: a thank-you, then two gentle ways to spend the
 * wait. It is not a page. The menu stays visible behind it, and a tap outside or Escape closes it. It only moves the guest
 * between screens; it sends nothing.
 */
export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({ isOpen, tableNumber, businessName, isAddon = false, onClose, onExploreServices, onExploreLounge }) => {
  const calm = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div key="order-success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onClick={onClose}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-zinc-950/40 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:items-center sm:pb-4">
          <motion.div role="dialog" aria-modal="true" aria-labelledby="order-success-title" onClick={(e) => e.stopPropagation()}
            initial={calm ? false : { opacity: 0, y: 32, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={calm ? undefined : { opacity: 0, y: 20 }} transition={SPRING}
            className="relative w-full max-w-[380px] rounded-[26px] border border-neutral-200/80 bg-white p-6 text-center shadow-[0_30px_70px_-24px_rgba(0,0,0,0.5)]">
            <motion.button type="button" onClick={onClose} aria-label="Close" {...press}
              className="absolute right-2 top-2 grid h-10 w-10 cursor-pointer place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-950">
              <X className="h-4 w-4" />
            </motion.button>

            <motion.span initial={calm ? false : { scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...SPRING, delay: 0.1 }}
              className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#0A3222] text-white shadow-[0_12px_26px_-12px_rgba(10,50,34,0.8)]">
              <Check className="h-6 w-6" strokeWidth={2.2} aria-hidden />
            </motion.span>

            <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-400">
              {tableNumber ? `Table ${tableNumber}` : 'Your table'} · {isAddon ? 'Added to your order' : 'Order received'}
            </p>
            <h2 id="order-success-title" className="mt-2 text-[24px] leading-[1.15] text-zinc-950 [text-wrap:balance]" style={SERIF}>
              Thank you. {isAddon ? 'Your additions have been sent to the kitchen.' : 'Your order has been sent to the kitchen.'}
            </h2>
            <p className="mx-auto mt-2.5 max-w-[300px] text-[13px] leading-relaxed text-zinc-500 [text-wrap:balance]">
              While your food is being prepared, you are welcome to explore what {businessName || 'the venue'} has to offer.
            </p>

            <div className="mt-5 space-y-2.5">
              <SuccessAction primary icon={<Compass className="h-4 w-4" aria-hidden />} title="Explore venue services" hint="Experiences, stays and more" onClick={onExploreServices} />
              <SuccessAction icon={<Camera className="h-4 w-4" aria-hidden />} title="Explore the lounge" hint="Share your moment with other guests" onClick={onExploreLounge} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OrderSuccessModal;

'use client';

import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Sparkles, X } from 'lucide-react';

interface OrderSuccessModalProps {
  isOpen: boolean;
  tableNumber: string;
  businessName: string;
  isAddon?: boolean;
  /** Dismiss and stay on the menu. */
  onClose: () => void;
  /** Open the live bill and order tracker. */
  onTrackOrder: () => void;
  /** Open the lounge while the kitchen prepares the order. */
  onExploreLounge: () => void;
}

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };
const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Shown the moment the kitchen has the order. Calm and unhurried: the guest decides whether to follow the order or to
 * spend the wait in the lounge. Nothing here sends anything; both actions only move the guest between screens.
 */
export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  isOpen,
  tableNumber,
  businessName,
  isAddon = false,
  onClose,
  onTrackOrder,
  onExploreLounge,
}) => {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const rise = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease },
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="order-success"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-success-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-between overflow-y-auto bg-[#faf9f6] px-6 pb-[calc(env(safe-area-inset-bottom,16px)+1.5rem)] pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] text-center"
        >
          {/* A faint warm light behind the mark: gradients only, no blur filter. */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[55%] bg-[radial-gradient(60%_50%_at_50%_30%,rgba(10,10,10,0.05),transparent_70%)]" />

          <div className="relative flex w-full items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-zinc-600 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              {tableNumber} · {isAddon ? 'Add-on confirmed' : 'Order confirmed'}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close and stay on the menu"
              className="grid h-9 w-9 place-items-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center">
            <motion.div
              initial={reduce ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease }}
              className="relative grid h-20 w-20 place-items-center rounded-full bg-zinc-950 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.55)]"
            >
              <Check className="h-9 w-9 text-white" strokeWidth={2} aria-hidden />
              {!reduce && (
                <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-zinc-950/10" />
              )}
            </motion.div>

            <motion.div {...rise(0.15)} className="mt-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
                {isAddon ? 'Added to your bill' : 'Sent to the kitchen'}
              </p>
              <h2 id="order-success-title" className="mt-3 text-[32px] font-normal leading-[1.1] tracking-tight text-zinc-950 sm:text-[38px] [text-wrap:balance]" style={serif}>
                {isAddon ? 'Your add-on is on its way.' : 'Your order is with the chef.'}
              </h2>
              <p className="mx-auto mt-3 max-w-xs text-[14px] leading-relaxed text-zinc-500 [text-wrap:balance]">
                {isAddon
                  ? `Added to Table ${tableNumber}'s bill. Follow it live, or make the most of the wait.`
                  : `Preparing for Table ${tableNumber}. Follow it live, or make the most of the wait.`}
              </p>
            </motion.div>
          </div>

          <motion.div {...rise(0.3)} className="relative w-full max-w-sm space-y-3">
            <button
              type="button"
              onClick={onTrackOrder}
              className="group flex w-full items-center justify-center gap-2.5 rounded-2xl bg-zinc-950 py-4 text-[13px] font-medium tracking-wide text-white shadow-[0_14px_30px_-14px_rgba(0,0,0,0.6)] transition-colors hover:bg-zinc-800 active:scale-[0.98] cursor-pointer"
            >
              Track your order
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
            </button>

            <button
              type="button"
              onClick={onExploreLounge}
              className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-3.5 text-left shadow-sm transition-colors hover:border-zinc-300 active:scale-[0.98]"
            >
              <span className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-zinc-100 text-zinc-950">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-[14px] font-medium text-zinc-950">Explore the lounge</span>
                  <span className="block text-[12px] text-zinc-500">While the chef prepares your order</span>
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
            </button>
          </motion.div>

          <p className="relative pt-6 text-[10px] font-medium uppercase tracking-[0.25em] text-zinc-400">{businessName}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OrderSuccessModal;

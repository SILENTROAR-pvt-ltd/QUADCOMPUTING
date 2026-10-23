'use client';

import React, { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BedDouble, Camera, Check, Compass, Radar, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SuccessAction } from './success/SuccessAction';
import { press, SPRING } from './motion';
import { tableLabel } from '@/lib/guest/room-mode';

interface OrderSuccessModalProps {
  isOpen: boolean;
  tableNumber: string;
  businessName: string;
  isAddon?: boolean;
  /** Room mode: the card sends the guest back to their room instead of to the venue's services and lounge. */
  roomCode?: string;
  /** Dismiss and stay on the menu. */
  onClose: () => void;
  /** Look at the venue's services while the food is being prepared. */
  onExploreServices: () => void;
  /** Open the lounge, to share a moment while waiting. */
  onExploreLounge: () => void;
  /** Follow the order: its live kitchen status and the running bill. */
  onTrackOrder?: () => void;
}

const SERIF = { fontFamily: "var(--font-luxe), 'Playfair Display', Georgia, serif" } as const;

/**
 * A small, polite card over the menu the moment the kitchen has the order: a thank-you, then two gentle ways to spend the
 * wait. It is not a page. The menu stays visible behind it, and a tap outside or Escape closes it. It only moves the guest
 * between screens; it sends nothing.
 */
export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({ isOpen, tableNumber, businessName, isAddon = false, roomCode, onClose, onExploreServices, onExploreLounge, onTrackOrder }) => {
  const calm = useReducedMotion();
  const router = useRouter();

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
            className="relative w-full max-w-[380px] overflow-hidden rounded-[28px] border border-[#e8dfcc] bg-[#fbf9f4] p-6 text-center shadow-[0_30px_70px_-24px_rgba(15,42,30,0.55)]">
            <span aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(217,193,147,0.38),transparent_68%)]" />
            <motion.button type="button" onClick={onClose} aria-label="Close" {...press}
              className="absolute right-2 top-2 grid h-10 w-10 cursor-pointer place-items-center rounded-full text-[#10231a]/45 hover:bg-[#f3ecdc] hover:text-[#10231a]">
              <X className="h-4 w-4" />
            </motion.button>

            <motion.span initial={calm ? false : { scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...SPRING, delay: 0.1 }}
              className="relative mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#0f2a1e] to-[#1d4632] text-[#d9c193] shadow-[0_0_0_4px_#fbf9f4,0_0_0_5px_rgba(176,141,87,0.5),0_14px_28px_-12px_rgba(15,42,30,0.8)]">
              <Check className="h-6 w-6" strokeWidth={2.2} aria-hidden />
            </motion.span>

            <p className="relative mt-5 text-[9.5px] font-semibold uppercase tracking-[0.28em] text-[#8a6d3f]">
              {tableNumber ? tableLabel(tableNumber) : 'Your table'} · {isAddon ? 'Added to your order' : 'Order received'}
            </p>
            <h2 id="order-success-title" className="relative mt-2 text-[28px] font-medium leading-[1.08] text-[#10231a] [text-wrap:balance]" style={SERIF}>
              Thank you. <em className="font-normal text-[#8a6d3f]">{isAddon ? 'Your additions have been sent to the kitchen.' : 'Your order has been sent to the kitchen.'}</em>
            </h2>
            <p className="relative mx-auto mt-2.5 max-w-[300px] text-[13px] leading-relaxed text-[#10231a]/60 [text-wrap:balance]">
              {roomCode
                ? 'The kitchen has it. It will be brought to your room and added to your room bill; nothing to pay now.'
                : 'The kitchen has it. Most orders reach the table in 15 to 25 minutes; the live status and your running bill are one tap away.'}
            </p>

            <div className="mt-5 space-y-2.5">
              {roomCode ? (
                <>
                  <SuccessAction primary icon={<BedDouble className="h-4 w-4" aria-hidden />} title="Track it in my room" hint="Live status, your bill, and the desk" onClick={() => router.push(`/room/${encodeURIComponent(roomCode)}`)} />
                  <SuccessAction icon={<Compass className="h-4 w-4" aria-hidden />} title="Add something else" hint="It joins the same room order" onClick={onClose} />
                  <SuccessAction icon={<Camera className="h-4 w-4" aria-hidden />} title="Explore the lounge" hint="Share your moment with other guests" onClick={onExploreLounge} />
                </>
              ) : (
                <>
                  <SuccessAction primary icon={<Radar className="h-4 w-4" aria-hidden />} title="Track my order" hint="Kitchen status and your running bill" onClick={onTrackOrder || onClose} />
                  <SuccessAction icon={<Compass className="h-4 w-4" aria-hidden />} title="Add something else" hint="It joins the same bill" onClick={onClose} />
                  <SuccessAction icon={<Camera className="h-4 w-4" aria-hidden />} title="Explore the lounge" hint={`What ${businessName || 'the venue'} has while you wait`} onClick={onExploreLounge} />
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OrderSuccessModal;

'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check } from 'lucide-react';
import { useGuestToast } from './toast-store';

/** "Order dispatched to kitchen — Live tracker active" and "Request sent: Spa for Table T-01" read as a title and a line under it. */
export function splitToast(message: string): { title: string; detail: string } {
  const dash = message.split(/\s[—–]\s/);
  if (dash.length > 1) return { title: dash[0].trim(), detail: dash.slice(1).join(' · ').trim() };
  const colon = message.match(/^([^:]{3,28}):\s+(.+)$/);
  if (colon) return { title: colon[1].trim(), detail: colon[2].trim() };
  return { title: message.trim(), detail: '' };
}

const isProblem = (message: string) => /^(failed|network error|couldn['’]t|could not|unable|no connection)/i.test(message.trim()) || /did not go through/i.test(message);

/**
 * A confirmation that feels like the rest of the guest app: an ivory card with a fine gold edge, a forest-green seal,
 * the headline in the serif face and the detail beneath it. A thin gold line runs down while it is on screen.
 * It reads its message from its own store (toast-store.ts), so it is the only thing that redraws when it shows or hides.
 * Everything that moves is a transform or opacity (no blur behind it, no width animation), so it stays smooth on a phone.
 */
export function LuxuryToast() {
  const message = useGuestToast((s) => s.message);
  const seq = useGuestToast((s) => s.seq);
  const durationMs = useGuestToast((s) => s.durationMs);
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.div
          key={seq}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10, transition: { duration: 0.14 } }}
          transition={{ type: 'spring', damping: 30, stiffness: 520, mass: 0.6 }}
          className="pointer-events-none fixed inset-x-0 top-5 z-[200] flex justify-center px-4 will-change-transform"
        >
          <ToastCard message={message} durationMs={durationMs} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ToastCard({ message, durationMs }: { message: string; durationMs: number }) {
  const { title, detail } = splitToast(message);
  const problem = isProblem(message);
  return (
    <div className="relative w-full max-w-[380px] overflow-hidden rounded-[22px] border border-[#e6d9b8] bg-[#fcfaf4] shadow-[0_14px_34px_-16px_rgba(10,50,34,0.45)]">
      <div className="flex items-center gap-3.5 py-3.5 pl-3.5 pr-5">
        <span
          aria-hidden
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ring-1 ring-inset ${problem ? 'bg-amber-50 ring-amber-300/70' : 'bg-[#0A3222] ring-[#c9a24a]/60'}`}
        >
          {problem ? <AlertCircle className="h-[18px] w-[18px] text-amber-700" /> : <Check className="h-[18px] w-[18px] text-amber-100" strokeWidth={2.4} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] leading-snug text-zinc-950" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{title}</span>
          {detail && <span className="mt-0.5 block text-[12px] leading-snug tracking-wide text-zinc-500">{detail}</span>}
        </span>
      </div>
      <motion.span
        aria-hidden
        className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-gradient-to-r from-[#c9a24a] via-[#e2c785] to-[#c9a24a]"
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: durationMs / 1000, ease: 'linear' }}
      />
    </div>
  );
}

export default LuxuryToast;

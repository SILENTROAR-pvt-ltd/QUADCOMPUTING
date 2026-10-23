"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";

interface BottomSheetProps {
  /** The id of the sheet's heading, for screen readers. */
  labelledBy: string;
  onClose: () => void;
  /** True while something is being sent: the sheet cannot be dismissed until it is done. */
  locked?: boolean;
  /** Fill the whole screen (a chat opened full screen); otherwise the usual sheet. */
  full?: boolean;
  /** A decorative layer painted behind the content (an ambient glow), clipped to the panel. */
  decor?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The guest app's bottom sheet: a dimmed backdrop that fades in and an ivory panel that springs up from the bottom (a
 * centred card from tablet up). Escape and a tap outside close it, the page behind stops scrolling, and a short phone
 * scrolls the panel itself rather than squashing its buttons.
 */
export function BottomSheet({ labelledBy, onClose, locked = false, full = false, decor, children }: BottomSheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !locked) onClose(); };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // The page behind holds its animations still while a sheet is open (see globals.css); counted, for stacked sheets.
    const root = document.documentElement;
    root.dataset.sheetOpen = String(Number(root.dataset.sheetOpen || 0) + 1);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      const left = Number(root.dataset.sheetOpen || 1) - 1;
      if (left > 0) root.dataset.sheetOpen = String(left); else delete root.dataset.sheetOpen;
    };
  }, [onClose, locked]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16 }}
      className={`fixed inset-0 z-[120] flex items-end justify-center bg-zinc-950/45 ${full ? '' : 'sm:items-center sm:p-6'}`}
      onClick={() => { if (!locked) onClose(); }}
    >
      <motion.div
        role="dialog" aria-modal="true" aria-labelledby={labelledBy} onClick={(e) => e.stopPropagation()}
        initial={{ y: 56, opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 420, damping: 38 }}
        className={`relative isolate ${full
          ? 'h-[100dvh] w-full overflow-hidden bg-[#faf8f2] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] sm:px-6'
          : 'max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[28px] bg-[#faf8f2] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] pt-5 shadow-2xl sm:rounded-[28px]'}`}
      >
        {decor && <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">{decor}</div>}
        {children}
      </motion.div>
    </motion.div>
  );
}

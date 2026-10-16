"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";

interface BottomSheetProps {
  /** The id of the sheet's heading, for screen readers. */
  labelledBy: string;
  onClose: () => void;
  /** True while something is being sent: the sheet cannot be dismissed until it is done. */
  locked?: boolean;
  children: React.ReactNode;
}

/**
 * The guest app's bottom sheet: a dimmed backdrop that fades in and an ivory panel that springs up from the bottom (a
 * centred card from tablet up). Escape and a tap outside close it, the page behind stops scrolling, and a short phone
 * scrolls the panel itself rather than squashing its buttons.
 */
export function BottomSheet({ labelledBy, onClose, locked = false, children }: BottomSheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !locked) onClose(); };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = previous; };
  }, [onClose, locked]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16 }}
      className="fixed inset-0 z-[120] flex items-end justify-center bg-zinc-950/45 sm:items-center sm:p-6"
      onClick={() => { if (!locked) onClose(); }}
    >
      <motion.div
        role="dialog" aria-modal="true" aria-labelledby={labelledBy} onClick={(e) => e.stopPropagation()}
        initial={{ y: 56, opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 420, damping: 38 }}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[28px] bg-[#faf8f2] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] pt-5 shadow-2xl sm:rounded-[28px]"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

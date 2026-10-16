"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { DialRow } from "./dial/DialRow";
import { press } from "./motion";

export interface DialAction {
  id: "profile" | "service" | "tracker" | "bill" | "services" | "lounge";
  label: string;
  onSelect: () => void;
  /** Shown instead of acting, for example a bill that has already been asked for. */
  done?: boolean;
}

/**
 * One round button that opens the places a guest goes next: table service, the order tracker, the bill, venue services,
 * the lounge and the profile. It always sits in the same spot, just above the dock and centred over the Me tab, and moves
 * with the dock when the cart bar comes and goes. The list opens upward from it.
 *
 * Rendered inside the dock's `relative` wrapper: the Me tab is the last of four columns in a bar with 6px padding and a
 * 1px border, so its centre is (width − 14px) / 8 + 7px from the right; less half the 56px button gives the offset below.
 */
export function QuickActionsDial({ actions }: { actions: DialAction[] }) {
  const [open, setOpen] = useState(false);
  const calm = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (actions.length === 0) return null;
  // The stack reads bottom to top from the button, so the first action is the one nearest the thumb.
  const stack = [...actions].reverse();

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.button type="button" aria-label="Close quick actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }} onClick={() => setOpen(false)}
            className="pointer-events-auto fixed inset-0 z-[58] cursor-default bg-zinc-950/35" />
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute bottom-full right-[calc((100%_-_14px)/8_-_21px)] z-[59] mb-4 flex flex-col items-end gap-2.5">
        <AnimatePresence>
          {open && (
            <motion.ul role="menu" aria-label="Quick actions" initial="hidden" animate="show" exit="hidden"
              variants={{ show: { transition: { staggerChildren: calm ? 0 : 0.04 } }, hidden: {} }}
              className="pointer-events-auto flex flex-col items-end gap-2.5">
              {stack.map((a) => <DialRow key={a.id} action={a} onPick={() => { setOpen(false); a.onSelect(); }} />)}
            </motion.ul>
          )}
        </AnimatePresence>

        <motion.button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu"
          aria-label={open ? "Close quick actions" : "Open quick actions"} {...press}
          className="pointer-events-auto relative grid h-14 w-14 cursor-pointer select-none place-items-center rounded-full bg-gradient-to-b from-neutral-800 to-neutral-950 text-white shadow-[0_16px_30px_-12px_rgba(10,50,34,0.75)] ring-2 ring-[#c9a24a]/70">
          <span aria-hidden className="absolute inset-[3px] rounded-full ring-1 ring-white/10" />
          <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: calm ? 0 : 0.2 }} className="grid place-items-center">
            {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5 text-[#f1d98a]" />}
          </motion.span>
        </motion.button>
      </div>
    </>
  );
}

export default QuickActionsDial;

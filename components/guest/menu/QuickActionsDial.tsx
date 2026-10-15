"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ConciergeBell, Radar, Receipt, Sparkles, User, Users, X } from "lucide-react";

export interface DialAction {
  id: "profile" | "service" | "tracker" | "bill" | "services" | "lounge";
  label: string;
  onSelect: () => void;
  /** Shown instead of acting, for example a bill that has already been asked for. */
  done?: boolean;
}

const ICON: Record<DialAction["id"], React.ComponentType<{ className?: string }>> = {
  profile: User,
  service: ConciergeBell,
  tracker: Radar,
  bill: Receipt,
  services: Sparkles,
  lounge: Users,
};

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
          <motion.button
            type="button"
            aria-label="Close quick actions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
            className="pointer-events-auto fixed inset-0 z-[58] cursor-default bg-zinc-950/35"
          />
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute bottom-full right-[calc((100%_-_14px)/8_-_21px)] z-[59] mb-4 flex flex-col items-end gap-2.5">
        <AnimatePresence>
          {open && (
            <motion.ul
              role="menu"
              aria-label="Quick actions"
              initial="hidden"
              animate="show"
              exit="hidden"
              variants={{ show: { transition: { staggerChildren: calm ? 0 : 0.04 } }, hidden: {} }}
              className="pointer-events-auto flex flex-col items-end gap-2.5"
            >
              {stack.map((a) => {
                const Icon = a.done ? Check : ICON[a.id];
                return (
                  <motion.li
                    key={a.id}
                    variants={{ hidden: { opacity: 0, y: 10, scale: 0.96 }, show: { opacity: 1, y: 0, scale: 1 } }}
                    transition={{ duration: 0.16 }}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      disabled={a.done}
                      onClick={() => { setOpen(false); a.onSelect(); }}
                      className="group flex cursor-pointer items-center gap-2.5 active:scale-[0.97] disabled:cursor-default"
                    >
                      <span className="whitespace-nowrap rounded-full bg-white px-3.5 py-2 font-sans text-[13px] font-semibold text-zinc-900 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.45)] ring-1 ring-zinc-200">
                        {a.label}
                      </span>
                      {/* Every icon sits in the same 56px column as the main button, so they line up in one straight edge. */}
                      <span className="grid w-14 shrink-0 place-items-center">
                        <span aria-hidden className={`grid h-11 w-11 place-items-center rounded-full shadow-[0_10px_24px_-12px_rgba(0,0,0,0.55)] ring-1 ${a.done ? "bg-emerald-600 text-white ring-emerald-500" : "bg-white text-zinc-900 ring-zinc-200"}`}>
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                      </span>
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={open ? "Close quick actions" : "Open quick actions"}
          className="pointer-events-auto relative grid h-14 w-14 cursor-pointer select-none place-items-center rounded-full bg-gradient-to-b from-neutral-800 to-neutral-950 text-white shadow-[0_16px_30px_-12px_rgba(10,50,34,0.75)] ring-2 ring-[#c9a24a]/70 transition-transform active:scale-90"
        >
          <span aria-hidden className="absolute inset-[3px] rounded-full ring-1 ring-white/10" />
          <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: calm ? 0 : 0.2 }} className="grid place-items-center">
            {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5 text-[#f1d98a]" />}
          </motion.span>
        </button>
      </div>
    </>
  );
}

export default QuickActionsDial;

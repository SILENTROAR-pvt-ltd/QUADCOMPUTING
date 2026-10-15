"use client";

import React, { useEffect, useRef, useState } from "react";
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

const POSITION_KEY = "quad_quick_actions_position";
const SIZE = 56;
const EDGE = 8;
/** One row of the open list, including the gap between rows. */
const ROW_HEIGHT = 54;
const DRAG_SLOP = 6;

type Pos = { x: number; y: number };

function clamp(value: number, low: number, high: number) {
  return Math.min(Math.max(value, low), Math.max(low, high));
}

/** The visible page area, without any scrollbar. Fixed positioning is measured against this, not window.innerWidth. */
function pageSize() {
  return { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight };
}

/** Keeps the whole button on screen. */
function clampPos(p: Pos): Pos {
  const { width, height } = pageSize();
  return {
    x: clamp(p.x, EDGE, width - EDGE - SIZE),
    y: clamp(p.y, EDGE, height - EDGE - SIZE),
  };
}

function readSaved(): Pos | null {
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_KEY) || "null");
    if (saved && typeof saved.x === "number" && typeof saved.y === "number") return saved;
  } catch {
    // Storage blocked or unreadable: fall back to the default spot.
  }
  return null;
}

/** The gap between the button and the top of the dock it rests above. */
const DOCK_GAP = 16;
const DOCK_SELECTOR = 'aside[aria-label="Guest Floating Controls Dock"]';

/** Where the button starts: centred over the Me tab and clear of the whole dock, including the cart bar when it shows. */
function defaultPos(): Pos {
  const tabs = document.querySelectorAll<HTMLElement>('nav[aria-label="Guest navigation"] > div > *');
  const me = tabs[tabs.length - 1];
  const dock = document.querySelector<HTMLElement>(DOCK_SELECTOR);
  if (me) {
    const m = me.getBoundingClientRect();
    const top = dock ? dock.getBoundingClientRect().top : m.top;
    return clampPos({ x: m.left + m.width / 2 - SIZE / 2, y: top - DOCK_GAP - SIZE });
  }
  const { width, height } = pageSize();
  return clampPos({ x: width - 80, y: height - 200 });
}

/**
 * One round button that opens the places a guest goes next: table service, the order tracker, the bill, venue services,
 * the lounge and the profile. A tap opens or closes the list. Press and drag moves the button anywhere on screen; the list
 * opens upward when there is room above it and downward when there is not. The spot is remembered on this device.
 */
export function QuickActionsDial({ actions }: { actions: DialAction[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const posRef = useRef<Pos | null>(null);
  const drag = useRef<{ id: number; startX: number; startY: number; lastX: number; lastY: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);
  /** True once the guest has put the button somewhere, so it stops following the dock. */
  const placed = useRef(false);
  const calm = useReducedMotion();

  // Start where the guest last left the button, or above the dock. Until the guest moves it, the default spot follows the
  // dock: the cart bar leaves after an order is sent, and the dock's height changes with it.
  useEffect(() => {
    const saved = readSaved();
    if (saved) placed.current = true;
    const apply = (next: Pos) => {
      posRef.current = next;
      setPos(next);
    };
    const place = () => {
      if (placed.current) {
        if (posRef.current) apply(clampPos(posRef.current));
        return;
      }
      apply(clampPos(defaultPos()));
    };
    apply(clampPos(saved ?? defaultPos()));
    const frame = requestAnimationFrame(place);
    const dock = document.querySelector<HTMLElement>(DOCK_SELECTOR);
    const observer = dock && typeof ResizeObserver !== "undefined" ? new ResizeObserver(place) : null;
    if (dock && observer) observer.observe(dock);
    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", place);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (actions.length === 0 || !pos) return null;
  const page = pageSize();
  // The stack reads bottom to top from the button, so the first action is the one nearest the thumb.
  const stack = [...actions].reverse();
  // Open upward when the button has room above it for the whole list; otherwise open downward.
  const openUp = pos.y > stack.length * ROW_HEIGHT + EDGE;

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    justDragged.current = false;
    drag.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    // The click that follows a drag must not also open the list.
    justDragged.current = true;
    placed.current = true;
    if (!posRef.current) return;
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify(posRef.current));
    } catch {
      // Storage blocked: the spot still holds until the page reloads.
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    // A move with no button held means the release was missed, so the drag ends here instead of following the pointer.
    if (e.buttons === 0) {
      endDrag();
      return;
    }
    if (!d.moved && Math.abs(e.clientX - d.startX) < DRAG_SLOP && Math.abs(e.clientY - d.startY) < DRAG_SLOP) return;
    d.moved = true;
    const cur = posRef.current;
    if (!cur) return;
    const next = clampPos({ x: cur.x + (e.clientX - d.lastX), y: cur.y + (e.clientY - d.lastY) });
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    posRef.current = next;
    setPos(next);
  };

  const toggle = () => {
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    setOpen((o) => !o);
  };

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

      {/* Anchored to the button's own edges, so the button stays put when the list opens either way. */}
      <div
        style={{
          right: page.width - (pos.x + SIZE),
          ...(openUp ? { bottom: page.height - (pos.y + SIZE) } : { top: pos.y }),
        }}
        className={`pointer-events-none fixed z-[59] flex items-end gap-2.5 ${openUp ? "flex-col" : "flex-col-reverse"}`}
      >
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
                      <span className="rounded-full bg-white px-3.5 py-2 font-sans text-[13px] font-semibold text-zinc-900 shadow-[0_10px_24px_-12px_rgba(0,0,0,0.45)] ring-1 ring-zinc-200">
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
          onClick={toggle}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={open ? "Close quick actions" : "Open quick actions. Drag to move"}
          className="pointer-events-auto relative grid h-14 w-14 touch-none cursor-grab select-none place-items-center rounded-full bg-gradient-to-b from-neutral-800 to-neutral-950 text-white shadow-[0_16px_30px_-12px_rgba(10,50,34,0.75)] ring-2 ring-[#c9a24a]/70 transition-transform active:scale-90 active:cursor-grabbing"
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

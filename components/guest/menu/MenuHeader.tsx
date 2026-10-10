"use client";

import { motion } from "framer-motion";
import { Receipt, Sparkles } from "lucide-react";
import { GUEST_BRAND } from "@/lib/brand";
import { MenuJourneySteps } from "./MenuJourneySteps";

export interface MenuHeaderProps {
  guestName?: string;
  venueName?: string;
  /** The venue's own line under its name, set by the host in the menu information. */
  tagline?: string;
  tableNo?: string;
  activeOrdersCount?: number;
  /** Dishes in the tray, not yet sent. Drives the "what to do next" steps. */
  cartCount?: number;
  onOpenBill?: () => void;
  billRequestedBanner?: boolean;
}

const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

/** The menu's first screen: who and where the guest is, and a clear next step. */
export function MenuHeader({
  guestName = "Guest",
  venueName = "Venue",
  tagline = "",
  tableNo = "T-05",
  activeOrdersCount = 0,
  cartCount = 0,
  onOpenBill,
  billRequestedBanner,
}: MenuHeaderProps) {
  return (
    <>
      <header className="relative w-full overflow-hidden">
        {/* Soft ambient glow behind the welcome: warm gold over a hint of emerald. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 h-[340px] bg-[radial-gradient(55%_60%_at_50%_30%,rgba(251,191,36,0.16),transparent_70%)]" />
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-10 h-48 w-[36rem] max-w-full -translate-x-1/2 rounded-full bg-emerald-300/15 blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-5 pb-4 text-center">
          <div className="mb-5 flex w-full items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white shadow-[0_6px_18px_-6px_rgba(0,0,0,0.5)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.7)]" />
              Table {tableNo}
            </span>

            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-400">{GUEST_BRAND.name}</span>

            {activeOrdersCount > 0 ? (
              <button
                onClick={onOpenBill}
                className="flex items-center gap-1.5 rounded-full border border-zinc-200/70 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-zinc-800 shadow-sm backdrop-blur transition-all hover:bg-white active:scale-95 cursor-pointer"
              >
                <Receipt className="text-zinc-600" size={13} />
                <span>Bill ({activeOrdersCount})</span>
              </button>
            ) : (
              <span className="w-[72px]" aria-hidden="true" />
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center"
          >
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-800">
              <Sparkles size={11} /> Order right from your table
            </span>
            <h1 className="text-3xl sm:text-5xl font-medium tracking-tight text-zinc-950" style={serif}>
              Welcome{guestName ? `, ${guestName}` : ""}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm sm:text-base font-light text-zinc-500">
              <span>at</span>
              <motion.span
                initial={{ opacity: 0, filter: "blur(6px)", y: 4 }}
                animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                className="bg-gradient-to-r from-zinc-950 via-emerald-900 to-zinc-950 bg-clip-text font-semibold text-transparent"
              >
                {venueName}
              </motion.span>
            </p>
            {tagline && (
              <p className="mt-1.5 max-w-sm text-xs italic text-zinc-500" style={serif}>{tagline}</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 flex w-full justify-center"
          >
            <MenuJourneySteps cartCount={cartCount} sentCount={activeOrdersCount} />
          </motion.div>
        </div>
      </header>

      {billRequestedBanner && (
        <div role="status" className="border-y border-amber-200/70 bg-amber-50/80 py-2 text-center text-xs text-amber-900">
          Bill requested. Your host is preparing it now.
        </div>
      )}
    </>
  );
}

export default MenuHeader;

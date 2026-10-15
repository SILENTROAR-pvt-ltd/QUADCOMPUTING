"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Receipt, Sparkles } from "lucide-react";
import { GUEST_BRAND } from "@/lib/brand";
import { greetingFor, greetingName } from "@/lib/guest/greeting";
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
const ease = [0.16, 1, 0.3, 1] as const;

/** The menu's first screen: the venue, a greeting for the guest, and a clear next step. */
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
  const [greeting] = useState(() => greetingFor(new Date().getHours()));
  const name = greetingName(guestName);

  return (
    <>
      <header className="relative w-full overflow-hidden">
        {/* Soft ambient light behind the venue's name: warm gold over a hint of emerald (gradients only, no blur filter). */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 h-[360px] bg-[radial-gradient(50%_55%_at_50%_32%,rgba(251,191,36,0.14),transparent_70%),radial-gradient(40%_40%_at_50%_55%,rgba(16,185,129,0.10),transparent_75%)]" />

        <div className="relative mx-auto w-full max-w-5xl px-4 pb-4 pt-4 sm:px-6">
          {/* Table on the left, the bill on the right. The brand sits dead centre when the screen is wide enough for all three. */}
          <div className="relative flex items-center justify-between gap-2">
            <span className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border border-[#e6d9b8] bg-white/90 pl-3 pr-3.5 shadow-[0_6px_16px_-10px_rgba(10,50,34,0.5)]">
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_8px_2px_rgba(16,185,129,0.45)]" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Table</span>
              <span className="text-[13px] font-semibold leading-none tracking-wide text-zinc-950">{tableNo}</span>
            </span>
            <span aria-hidden className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.26em] text-zinc-400 min-[480px]:block">{GUEST_BRAND.name}</span>
            {activeOrdersCount > 0 ? (
              <button
                onClick={onOpenBill}
                className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#e6d9b8] bg-white/90 px-3.5 text-xs font-medium text-zinc-800 shadow-[0_6px_16px_-10px_rgba(10,50,34,0.5)] transition-colors hover:bg-white active:scale-95 cursor-pointer"
              >
                <Receipt className="text-zinc-600" size={13} />
                <span>Bill ({activeOrdersCount})</span>
              </button>
            ) : <span aria-hidden="true" />}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
            className="mx-auto mt-7 flex max-w-xl flex-col items-center text-center sm:mt-9"
          >
            <p className="text-[13px] font-medium tracking-wide text-zinc-500 sm:text-sm">
              {greeting}{name && <>, <span className="text-zinc-900">{name}</span></>}
              <span className="text-zinc-400"> · welcome to</span>
            </p>
            <h1 className="mt-1.5 text-[30px] font-semibold leading-[1.08] tracking-tight text-zinc-950 [text-wrap:balance] sm:text-[42px]" style={serif}>
              {venueName}
            </h1>
            {tagline && (
              <p className="mt-2 max-w-md text-[13px] italic leading-snug text-zinc-500 [text-wrap:balance] sm:text-sm" style={serif}>{tagline}</p>
            )}
            <span className="mt-3.5 inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-800">
              <Sparkles size={11} aria-hidden /> Order right from your table
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease }}
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

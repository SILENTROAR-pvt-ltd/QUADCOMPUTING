"use client";

import React, { useState } from "react";
import { Receipt, Sparkles } from "lucide-react";
import { GUEST_BRAND } from "@/lib/brand";
import { greetingFor, greetingName } from "@/lib/guest/greeting";
import { isRoomTable } from "@/lib/guest/room-mode";
import { LUXE_SERIF } from "@/components/guest/luxe/luxe-theme";
import s from "@/components/guest/luxe/luxe-guest.module.css";
import { MenuHeroBanner } from "./hero/MenuHeroBanner";

export interface MenuHeaderProps {
  guestName?: string;
  venueName?: string;
  /** The venue's own line under its name, set by the host in the menu information. */
  tagline?: string;
  tableNo?: string;
  activeOrdersCount?: number;
  onOpenBill?: () => void;
  billRequestedBanner?: boolean;
  /** The venue's own dish photos for the banner's film (its top picks first). */
  photos?: string[];
}

const GLASS = "inline-flex h-9 items-center whitespace-nowrap rounded-full border border-white/20 bg-[#08160f]/45 text-[#f5f1e8]";
const delay = (d: number) => ({ ["--d" as string]: `${d}s` }) as React.CSSProperties;

/** The menu's first screen: the venue as a banner over its own dishes, a greeting for the guest, and the next step. */
export function MenuHeader({
  guestName = "Guest",
  venueName = "Venue",
  tagline = "",
  tableNo = "T-05",
  activeOrdersCount = 0,
  onOpenBill,
  billRequestedBanner,
  photos = [],
}: MenuHeaderProps) {
  const [greeting] = useState(() => greetingFor(new Date().getHours()));
  const name = greetingName(guestName);
  const room = isRoomTable(tableNo);

  return (
    <>
      <header className="relative w-full">
        <MenuHeroBanner photos={photos}>
          <div className="relative mx-auto flex min-h-[340px] w-full max-w-5xl flex-col px-4 pb-11 pt-4 sm:min-h-[420px] sm:px-6">
            {/* Table on the left, the bill on the right, the brand between them when there is room. */}
            <div className="relative flex items-center justify-between gap-2">
              <span className={`${GLASS} gap-2 pl-3 pr-3.5`}>
                <span aria-hidden className={`${s.pulse} h-1.5 w-1.5 shrink-0 rounded-full bg-[#d9c193]`} />
                <span className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#f5f1e8]/70">{room ? "Room" : "Table"}</span>
                <span className="text-[13px] font-semibold leading-none tracking-wide">{room ? tableNo.slice(3) : tableNo}</span>
              </span>
              <span aria-hidden className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.3em] text-[#f5f1e8]/55 min-[480px]:block">{GUEST_BRAND.name}</span>
              {activeOrdersCount > 0 ? (
                <button onClick={onOpenBill} className={`${GLASS} cursor-pointer gap-1.5 px-3.5 text-xs font-medium transition-colors hover:bg-[#08160f]/60 active:scale-95`}>
                  <Receipt className="text-[#d9c193]" size={13} />
                  <span>Bill ({activeOrdersCount})</span>
                </button>
              ) : <span aria-hidden="true" />}
            </div>

            <div className="mx-auto mt-auto flex max-w-xl flex-col items-center pt-10 text-center">
              <p className={`${s.enter} text-[10.5px] font-semibold uppercase tracking-[0.28em] text-[#e6cf9c] [text-shadow:0_1px_10px_rgba(0,0,0,0.6)]`} style={delay(0.05)}>
                {greeting}{name && <>, {name}</>} <span className="text-[#f5f1e8]/55">· welcome to</span>
              </p>
              <h1 className={`${s.enter} mt-3 text-[42px] font-light leading-[1.02] tracking-[0.01em] text-[#f5f1e8] [text-shadow:0_2px_24px_rgba(0,0,0,0.45)] [text-wrap:balance] sm:text-[60px]`} style={{ ...LUXE_SERIF, ...delay(0.18) }}>
                {venueName}
              </h1>
              {tagline && (
                <p className={`${s.enter} mt-2.5 max-w-md text-[17px] italic leading-snug text-[#f5f1e8]/75 [text-wrap:balance]`} style={{ ...LUXE_SERIF, ...delay(0.3) }}>{tagline}</p>
              )}
              <span aria-hidden className={`${s.enter} mt-4 h-px w-12 bg-[#d9c193]/60`} style={delay(0.38)} />
              <span className={`${s.enter} mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#d9c193]/45 bg-white/[0.07] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f1e4c4]`} style={delay(0.45)}>
                <Sparkles size={11} aria-hidden /> {room ? "Order right to your room" : "Order right from your table"}
              </span>
            </div>
          </div>
        </MenuHeroBanner>
      </header>

      {billRequestedBanner && (
        <div role="status" className="mx-4 mt-3 rounded-2xl border border-[#d9c193]/60 bg-[#fbf6e8] py-2 text-center text-xs text-[#6f5631] sm:mx-6">
          Bill requested. Our team is preparing it now.
        </div>
      )}
    </>
  );
}

export default MenuHeader;

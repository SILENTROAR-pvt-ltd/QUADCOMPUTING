"use client";

import { ChevronRight, ConciergeBell } from "lucide-react";
import { TRACKER_MEDIA, resolveTrackerStage, stageCopy, type TrackerStage } from "./tracker/tracker-copy";
import { TrackerVideo } from "./tracker/TrackerVideo";

const DOT: Record<TrackerStage, string> = { received: "bg-sky-400", preparing: "bg-amber-400", ready: "bg-emerald-400", served: "bg-emerald-400" };

interface TrackerDockProps {
  tableNumber: string;
  kotStatus?: string | null;
  orderStatus?: string | null;
  ticketNumber?: string | null;
  itemCount: number;
  runningTotal: number;
  /** Opens the full tracker. */
  onOpen: () => void;
  /** Asks the floor for table service, from right here. */
  onRequestService: () => void;
}

/**
 * The order's progress as one slim bar that stays at the top while the guest scrolls the menu: where the order is, the
 * bill so far, a bell for table service and a tap to open the full tracker. The big tracker no longer pushes the menu down.
 */
export function TrackerDock({ tableNumber, kotStatus, orderStatus, ticketNumber, itemCount, runningTotal, onOpen, onRequestService }: TrackerDockProps) {
  const stage = resolveTrackerStage(String(kotStatus || ""), String(orderStatus || ""));
  const copy = stageCopy(stage, tableNumber);
  return (
    <div className="sticky top-2 z-40 isolate flex items-stretch gap-2 overflow-hidden rounded-2xl bg-neutral-950 p-1.5 text-white shadow-[0_14px_30px_-14px_rgba(10,50,34,0.7)] ring-1 ring-white/10">
      {/* The same chef banner as the full tracker, darkened so the words stay readable. */}
      <TrackerVideo src={TRACKER_MEDIA.banner.src} poster={TRACKER_MEDIA.banner.poster} fit="cover" position="80% 50%" className="absolute inset-0" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-neutral-950/90 via-neutral-950/70 to-neutral-950/40" />
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Order status: ${copy.eyebrow}. Open the tracker`}
        className="relative flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left active:bg-white/5"
      >
        <span aria-hidden className="relative flex h-2.5 w-2.5 shrink-0">
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${DOT[stage]}`} />
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${DOT[stage]}`} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-sans text-[13px] font-semibold leading-tight">{copy.eyebrow}</span>
          <span className="block truncate font-sans text-[11px] leading-tight text-neutral-400">
            {ticketNumber ? `${ticketNumber} · ` : ""}{itemCount} {itemCount === 1 ? "item" : "items"} · ₹{Math.round(runningTotal)}
          </span>
        </span>
        <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-neutral-400" />
      </button>

      <button
        type="button"
        onClick={onRequestService}
        aria-label="Request table service"
        title="Request table service"
        className="relative grid w-12 shrink-0 cursor-pointer place-items-center rounded-xl bg-white/10 text-amber-200 ring-1 ring-white/10 backdrop-blur-sm transition-colors active:scale-95 active:bg-white/20"
      >
        <ConciergeBell className="h-[18px] w-[18px]" aria-hidden />
      </button>
    </div>
  );
}


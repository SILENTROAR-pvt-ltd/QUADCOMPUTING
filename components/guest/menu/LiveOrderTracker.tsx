'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import type { ActiveOrderItem } from './types';
import { TrackerTimeline } from './TrackerTimeline';
import { TrackerStatusCallout } from './TrackerStatusCallout';
import { TrackerActions } from './TrackerActions';
import { TrackerSettledView } from './tracker/TrackerSettledView';
import { TrackerVideo } from './tracker/TrackerVideo';
import { TRACKER_MEDIA, chefClipFor, resolveTrackerStage, stageCopy, stageStep } from './tracker/tracker-copy';

export interface LiveOrderTrackerProps {
  tableNumber?: string;
  kotStatus?: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | string | null;
  orderStatus?: string | null;
  ticketNumber?: string | null;
  items?: ActiveOrderItem[] | Array<{ name?: string; item_name?: string; quantity: number }>;
  runningTotal?: number;
  onViewBill?: () => void;
  onRequestBill?: () => void;
  isRequestingBill?: boolean;
  billRequested?: boolean;
  billSettled?: boolean;
  settledTotal?: number;
  /** Real cashback credited to the wallet for this bill (from the order API). */
  cashbackCredited?: number;
  onExploreLounge?: () => void;
  /** The venue, so a review can be sent after the bill settles. */
  venueId?: string;
  /** The order this device took part in, so its settled bill can be fetched. */
  orderId?: string | null;
  /** Whether the guest is signed in: only then is cashback mentioned after the bill settles. */
  signedIn?: boolean;
  /** The venue's name, for the thank-you and the bill. */
  cafeName?: string;
  isAddon?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  /** Bumped by the parent to open the card, even if the guest had folded it. */
  openRequest?: number;
  order?: {
    id?: string;
    kot_number?: string;
    table_name?: string;
    status: 'placed' | 'preparing' | 'ready' | 'served' | string;
    items?: Array<{ name?: string; item_name?: string; quantity: number }>;
    total_amount?: number;
  };
}

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;
const WHISPER_MS = 7000;

export function LiveOrderTracker({
  tableNumber,
  kotStatus = 'PENDING',
  orderStatus,
  ticketNumber,
  items = [],
  runningTotal,
  onViewBill,
  onRequestBill,
  isRequestingBill = false,
  billRequested = false,
  billSettled = false,
  settledTotal = 0,
  cashbackCredited = 0,
  onExploreLounge,
  venueId,
  orderId,
  signedIn = false,
  cafeName,
  isAddon = false,
  onRefresh,
  isRefreshing = false,
  openRequest = 0,
  order,
}: LiveOrderTrackerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [whisper, setWhisper] = useState(0);
  const calm = useReducedMotion();

  // Normalize data between granular props and order object
  const resolvedTable = tableNumber || order?.table_name || 'Table';
  const resolvedTicket = ticketNumber || order?.kot_number || 'KOT-LIVE';
  const resolvedKot = (kotStatus || order?.status || 'placed').toUpperCase();
  const resolvedOrd = (orderStatus || order?.status || 'placed').toUpperCase();
  const resolvedItems = items && items.length > 0 ? items : order?.items || [];
  const resolvedTotal = runningTotal !== undefined ? runningTotal : order?.total_amount || 0;

  // Where the order is in the kitchen: received, being prepared, ready, served.
  const stage = resolveTrackerStage(resolvedKot, resolvedOrd);
  const currentStep = stageStep(stage);
  const copy = stageCopy(stage, resolvedTable);

  // A new gentle line under the headline every few seconds (not at all for guests who prefer less motion).
  useEffect(() => {
    setWhisper(0);
    if (calm || billSettled) return;
    const timer = setInterval(() => setWhisper((n) => (n + 1) % copy.whispers.length), WHISPER_MS);
    return () => clearInterval(timer);
  }, [stage, calm, billSettled, copy.whispers.length]);

  // The menu's "Order tracker" action asks for the card to be open.
  useEffect(() => {
    if (openRequest > 0) setCollapsed(false);
  }, [openRequest]);

  if (billSettled) {
    if (Number(settledTotal || 0) <= 0) return null;
    return <TrackerSettledView tableNumber={resolvedTable} settledTotal={settledTotal} cashbackCredited={cashbackCredited} cafeName={(order as any)?.business_name || (order as any)?.cafe_name || cafeName} venueId={venueId} orderId={orderId || order?.id || null} signedIn={signedIn} />;
  }

  const clip = chefClipFor(stage);
  const roundBtn = 'grid h-8 w-8 place-items-center rounded-full bg-white/10 text-neutral-200 ring-1 ring-white/15 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white cursor-pointer';

  return (
    <section
      id="live-order-tracker"
      data-kot-step={currentStep}
      data-kot-status={resolvedKot}
      aria-label="Live order tracker"
      className="mb-6 w-full overflow-hidden rounded-[28px] border border-[#e6d9b8]/80 bg-[#fcfaf4] shadow-[0_24px_60px_-28px_rgba(10,50,34,0.45)]"
    >
      {/* Banner: a chef at work behind the headline, darkened so the words stay easy to read. */}
      <header className="relative isolate overflow-hidden bg-neutral-950 text-white">
        <TrackerVideo src={TRACKER_MEDIA.banner.src} poster={TRACKER_MEDIA.banner.poster} fit="cover" position="80% 50%" className="absolute inset-0" />
        {/* Light enough that the kitchen shows through; darker on the left and at the foot, where the words sit. */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-neutral-950/80 via-neutral-950/45 to-neutral-950/5" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-neutral-950/70 via-transparent to-neutral-950/25" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#c9a24a]/70 to-transparent" />

        <div className="relative px-5 pb-6 pt-4 sm:px-7 sm:pb-7 sm:pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-amber-100/85">
              <span aria-hidden className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span>Live · {copy.eyebrow}</span>
              <span className="rounded-full border border-white/20 px-2 py-0.5 font-mono tracking-wider text-white/80">{resolvedTicket}</span>
              {isAddon && <span className="rounded-full border border-amber-300/40 px-2 py-0.5 text-amber-200">Added to your order</span>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {onRefresh && (
                <button type="button" onClick={onRefresh} title="Check the kitchen again" aria-label="Check the kitchen again" className={roundBtn}>
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-white' : ''}`} />
                </button>
              )}
              <button type="button" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle Tracker" aria-expanded={!collapsed} className={roundBtn}>
                {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div aria-live="polite">
            <motion.h3
              key={stage}
              initial={calm ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="mt-4 max-w-md text-[25px] leading-[1.15] text-white sm:text-[32px]"
              style={SERIF}
            >
              {copy.headline}
            </motion.h3>
            <p className="mt-2 max-w-md text-[13px] leading-relaxed text-neutral-200/90">{copy.detail}</p>
          </div>

          <div className="mt-3 h-5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={`${stage}-${whisper}`}
                initial={calm ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={calm ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.4 }}
                className="truncate text-[12.5px] italic text-amber-100/80"
              >
                {copy.whispers[whisper] ?? ''}
              </motion.p>
            </AnimatePresence>
          </div>

          <p className="mt-4 text-[11px] tracking-wide text-neutral-300/80">
            {resolvedTable === 'Table' ? 'Your table' : `Table ${resolvedTable}`} &middot; {resolvedItems.length} {resolvedItems.length === 1 ? 'item' : 'items'} &middot; ₹{resolvedTotal}
          </p>
        </div>
      </header>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-6 sm:px-7 sm:py-7">
              <div className="grid grid-cols-[104px_1fr] items-center gap-5 sm:grid-cols-[150px_1fr] sm:gap-9">
                {/* The chef: busy while the order is received and prepared, pleased when it is ready. */}
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-white shadow-[0_16px_34px_-22px_rgba(10,50,34,0.55)] ring-1 ring-[#e6d9b8]">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={clip}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      className="absolute inset-0"
                    >
                      <TrackerVideo src={TRACKER_MEDIA[clip].src} poster={TRACKER_MEDIA[clip].poster} fit="contain" className="absolute inset-0" />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <TrackerTimeline currentStep={currentStep} kotNumber={resolvedTicket} status={resolvedKot.toLowerCase()} stage={stage} />
              </div>

              <TrackerStatusCallout items={resolvedItems} isAddon={isAddon} />

              <TrackerActions
                totalAmount={resolvedTotal}
                onViewBill={onViewBill}
                onRequestBill={onRequestBill}
                isRequestingBill={isRequestingBill}
                billRequested={billRequested}
                onExploreLounge={onExploreLounge}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

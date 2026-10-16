'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { ActiveOrderItem } from './types';
import { TrackerSettledView } from './tracker/TrackerSettledView';
import { TrackerBanner } from './tracker/TrackerBanner';
import { TrackerBody } from './tracker/TrackerBody';
import { resolveTrackerStage, stageCopy, stageStep } from './tracker/tracker-copy';

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

const WHISPER_MS = 7000;

/** The order tracker on the menu page: a banner with where the order is, and the unfolded timeline and actions. */
export function LiveOrderTracker(p: LiveOrderTrackerProps) {
  const { order, billSettled = false, openRequest = 0 } = p;
  const [collapsed, setCollapsed] = useState(false);
  const [whisper, setWhisper] = useState(0);
  const calm = Boolean(useReducedMotion());

  const table = p.tableNumber || order?.table_name || 'Table';
  const ticket = p.ticketNumber || order?.kot_number || 'KOT-LIVE';
  const kot = (p.kotStatus || order?.status || 'placed').toUpperCase();
  const ord = (p.orderStatus || order?.status || 'placed').toUpperCase();
  const items = p.items && p.items.length > 0 ? p.items : order?.items || [];
  const total = p.runningTotal !== undefined ? p.runningTotal : order?.total_amount || 0;

  // Where the order is in the kitchen: received, being prepared, ready, served.
  const stage = resolveTrackerStage(kot, ord);
  const step = stageStep(stage);
  const copy = stageCopy(stage, table);

  // A new gentle line under the headline every few seconds (not at all for guests who prefer less motion).
  useEffect(() => {
    setWhisper(0);
    if (calm || billSettled) return;
    const timer = setInterval(() => setWhisper((n) => (n + 1) % copy.whispers.length), WHISPER_MS);
    return () => clearInterval(timer);
  }, [stage, calm, billSettled, copy.whispers.length]);

  // The menu's "Order tracker" action asks for the card to be open.
  useEffect(() => { if (openRequest > 0) setCollapsed(false); }, [openRequest]);

  if (billSettled) {
    if (Number(p.settledTotal || 0) <= 0) return null;
    return (
      <TrackerSettledView tableNumber={table} settledTotal={p.settledTotal ?? 0} cashbackCredited={p.cashbackCredited ?? 0}
        cafeName={(order as any)?.business_name || (order as any)?.cafe_name || p.cafeName} venueId={p.venueId}
        orderId={p.orderId || order?.id || null} signedIn={p.signedIn ?? false} />
    );
  }

  return (
    <section id="live-order-tracker" data-kot-step={step} data-kot-status={kot} aria-label="Live order tracker"
      className="mb-6 w-full overflow-hidden rounded-[28px] border border-[#e6d9b8]/80 bg-[#fcfaf4] shadow-[0_24px_60px_-28px_rgba(10,50,34,0.45)]">
      <TrackerBanner stage={stage} copy={copy} whisper={whisper} calm={calm} ticket={ticket} table={table} itemCount={items.length}
        total={total} isAddon={p.isAddon ?? false} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)}
        onRefresh={p.onRefresh} isRefreshing={p.isRefreshing ?? false} />

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <TrackerBody stage={stage} step={step} ticket={ticket} kotStatus={kot} items={items} total={total} isAddon={p.isAddon ?? false}
              onViewBill={p.onViewBill} onRequestBill={p.onRequestBill} isRequestingBill={p.isRequestingBill ?? false}
              billRequested={p.billRequested ?? false} onExploreLounge={p.onExploreLounge} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

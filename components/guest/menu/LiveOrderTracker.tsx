'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import type { ActiveOrderItem } from './types';
import { TrackerTimeline } from './TrackerTimeline';
import { TrackerStatusCallout } from './TrackerStatusCallout';
import { TrackerActions } from './TrackerActions';
import { TrackerSettledView } from './tracker/TrackerSettledView';

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
  onExploreServices?: () => void;
  isAddon?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  order?: {
    id?: string;
    kot_number?: string;
    table_name?: string;
    status: 'placed' | 'preparing' | 'ready' | 'served' | string;
    items?: Array<{ name?: string; item_name?: string; quantity: number }>;
    total_amount?: number;
  };
}

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
  onExploreServices,
  isAddon = false,
  onRefresh,
  isRefreshing = false,
  order,
}: LiveOrderTrackerProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Normalize data between granular props and order object
  const resolvedTable = tableNumber || order?.table_name || 'Table';
  const resolvedTicket = ticketNumber || order?.kot_number || 'KOT-LIVE';
  const resolvedKot = (kotStatus || order?.status || 'placed').toUpperCase();
  const resolvedOrd = (orderStatus || order?.status || 'placed').toUpperCase();
  const resolvedItems = items && items.length > 0 ? items : order?.items || [];
  const resolvedTotal = runningTotal !== undefined ? runningTotal : order?.total_amount || 0;

  if (billSettled) {
    if (Number(settledTotal || 0) <= 0) return null;
    return <TrackerSettledView tableNumber={resolvedTable} settledTotal={settledTotal} cashbackCredited={cashbackCredited} cafeName={(order as any)?.business_name || (order as any)?.cafe_name} />;
  }

  // Map cooking pipeline to step index (0: Placed, 1: Preparing, 2: Ready/Served)
  const isStage3 =
    ['READY', 'SERVED', 'COMPLETED', 'DELIVERED'].includes(resolvedKot) ||
    ['READY', 'SERVED', 'COMPLETED', 'DELIVERED'].includes(resolvedOrd);
  const isStage2 =
    !isStage3 &&
    (['PREPARING', 'PROCESSING', 'STARTED', 'COOKING', 'IN_PROGRESS'].includes(resolvedKot) ||
      ['PREPARING', 'PROCESSING', 'COOKING'].includes(resolvedOrd));
  const currentStep = isStage3 ? 2 : isStage2 ? 1 : 0;

  return (
    <div data-kot-step={currentStep} data-kot-status={resolvedKot} className="w-full mb-6 rounded-3xl backdrop-blur-2xl bg-white/95 border border-neutral-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-300">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-800 text-white">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold tracking-wide">Live Order Tracker</h3>
              {isAddon && (
                <span className="text-[9px] uppercase font-semibold px-2 py-0.5 rounded-full bg-white/10 text-amber-300 border border-amber-500/30">
                  Add-on Active
                </span>
              )}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-emerald-300 border border-emerald-500/30">
                {resolvedTicket}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Table {resolvedTable} &bull; {resolvedItems.length} {resolvedItems.length === 1 ? 'Item' : 'Items'} (₹{resolvedTotal})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              title="Sync kitchen status"
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-white' : ''}`} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Toggle Tracker"
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-5 sm:p-6">
              {/* Modular Progress Timeline */}
              <TrackerTimeline
                currentStep={currentStep}
                kotNumber={resolvedTicket}
                status={resolvedKot.toLowerCase()}
              />

              {/* Modular Kitchen Status & Dishes Callout */}
              <TrackerStatusCallout items={resolvedItems} />

              {/* Modular Action Buttons */}
              <TrackerActions
                totalAmount={resolvedTotal}
                onViewBill={onViewBill}
                onRequestBill={onRequestBill}
                isRequestingBill={isRequestingBill}
                billRequested={billRequested}
                onExploreServices={onExploreServices}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

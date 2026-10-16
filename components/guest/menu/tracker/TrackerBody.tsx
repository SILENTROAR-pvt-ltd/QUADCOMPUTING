'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ActiveOrderItem } from '../types';
import { TrackerTimeline } from '../TrackerTimeline';
import { TrackerStatusCallout } from '../TrackerStatusCallout';
import { TrackerActions } from '../TrackerActions';
import { TrackerVideo } from './TrackerVideo';
import { TRACKER_MEDIA, chefClipFor, type TrackerStage } from './tracker-copy';

interface TrackerBodyProps {
  stage: TrackerStage;
  step: number;
  ticket: string;
  kotStatus: string;
  items: ActiveOrderItem[] | Array<{ name?: string; item_name?: string; quantity: number }>;
  total: number;
  isAddon: boolean;
  onViewBill?: () => void;
  onRequestBill?: () => void;
  isRequestingBill: boolean;
  billRequested: boolean;
  onExploreLounge?: () => void;
}

/** The unfolded tracker: the chef (busy, then pleased), the step timeline, what is in the order, and the actions. */
export function TrackerBody(p: TrackerBodyProps) {
  const clip = chefClipFor(p.stage);
  return (
    <div className="px-5 py-6 sm:px-7 sm:py-7">
      <div className="grid grid-cols-[104px_1fr] items-center gap-5 sm:grid-cols-[150px_1fr] sm:gap-9">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-white shadow-[0_16px_34px_-22px_rgba(10,50,34,0.55)] ring-1 ring-[#e6d9b8]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={clip} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="absolute inset-0">
              <TrackerVideo src={TRACKER_MEDIA[clip].src} poster={TRACKER_MEDIA[clip].poster} fit="contain" className="absolute inset-0" />
            </motion.div>
          </AnimatePresence>
        </div>
        <TrackerTimeline currentStep={p.step} kotNumber={p.ticket} status={p.kotStatus.toLowerCase()} stage={p.stage} />
      </div>

      <TrackerStatusCallout items={p.items} isAddon={p.isAddon} />
      <TrackerActions totalAmount={p.total} onViewBill={p.onViewBill} onRequestBill={p.onRequestBill}
        isRequestingBill={p.isRequestingBill} billRequested={p.billRequested} onExploreLounge={p.onExploreLounge} />
    </div>
  );
}

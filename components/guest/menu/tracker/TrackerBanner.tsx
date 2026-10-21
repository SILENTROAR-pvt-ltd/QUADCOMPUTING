'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { TrackerVideo } from './TrackerVideo';
import { TRACKER_MEDIA, type StageCopy } from './tracker-copy';
import { press } from '../motion';
import { tableLabel } from '@/lib/guest/room-mode';

const SERIF = { fontFamily: "'Playfair Display', Georgia, serif" } as const;
const ROUND = 'grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-white/10 text-neutral-200 ring-1 ring-white/15 backdrop-blur-sm hover:bg-white/20 hover:text-white';

interface TrackerBannerProps {
  stage: string;
  copy: StageCopy;
  whisper: number;
  calm: boolean;
  ticket: string;
  table: string;
  itemCount: number;
  total: number;
  isAddon: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onRefresh?: () => void;
  isRefreshing: boolean;
}

/** The tracker's banner: a chef at work behind the headline, darkened so the words stay easy to read. */
export function TrackerBanner(p: TrackerBannerProps) {
  const { calm, copy } = p;
  return (
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
            <span className="rounded-full border border-white/20 px-2 py-0.5 font-mono tracking-wider text-white/80">{p.ticket}</span>
            {p.isAddon && <span className="rounded-full border border-amber-300/40 px-2 py-0.5 text-amber-200">Added to your order</span>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {p.onRefresh && (
              <motion.button type="button" onClick={p.onRefresh} title="Check the kitchen again" aria-label="Check the kitchen again" {...press} className={ROUND}>
                <RefreshCw className={`h-3.5 w-3.5 ${p.isRefreshing ? 'animate-spin text-white' : ''}`} />
              </motion.button>
            )}
            <motion.button type="button" onClick={p.onToggle} aria-label="Toggle Tracker" aria-expanded={!p.collapsed} {...press} className={ROUND}>
              {p.collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </motion.button>
          </div>
        </div>

        <div aria-live="polite">
          <motion.h3 key={p.stage} initial={calm ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}
            className="mt-4 max-w-md text-[25px] leading-[1.15] text-white sm:text-[32px]" style={SERIF}>
            {copy.headline}
          </motion.h3>
          <p className="mt-2 max-w-md text-[13px] leading-relaxed text-neutral-200/90">{copy.detail}</p>
        </div>

        <div className="mt-3 h-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={`${p.stage}-${p.whisper}`} initial={calm ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              exit={calm ? undefined : { opacity: 0, y: -4 }} transition={{ duration: 0.4 }} className="truncate text-[12.5px] italic text-amber-100/80">
              {copy.whispers[p.whisper] ?? ''}
            </motion.p>
          </AnimatePresence>
        </div>

        <p className="mt-4 text-[11px] tracking-wide text-neutral-300/80">
          {p.table === 'Table' ? 'Your table' : tableLabel(p.table)} &middot; {p.itemCount} {p.itemCount === 1 ? 'item' : 'items'} &middot; ₹{p.total}
        </p>
      </div>
    </header>
  );
}

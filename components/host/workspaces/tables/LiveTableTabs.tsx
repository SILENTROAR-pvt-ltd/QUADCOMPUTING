'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BellRing } from 'lucide-react';
import { press, SPRING } from '@/components/guest/menu/motion';

export type TableView = 'bill' | 'kitchen' | 'add';

interface LiveTableTabsProps {
  view: TableView;
  onView: (v: TableView) => void;
  billLines: number;
  openTickets: number;
  readyDishes: number;
}

/** The "dishes ready to serve" shortcut and the Bill / Kitchen / Add items switch of a table's panel. */
export function LiveTableTabs({ view, onView, billLines, openTickets, readyDishes }: LiveTableTabsProps) {
  const label = (v: TableView) => (v === 'bill' ? `Bill · ${billLines}` : v === 'kitchen' ? `Kitchen · ${openTickets}` : 'Add items');
  return (
    <>
      {readyDishes > 0 && view !== 'kitchen' && (
        <button type="button" onClick={() => onView('kitchen')}
          className="flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-xl bg-emerald-600 px-3 text-left text-[13px] font-semibold text-white active:bg-emerald-700">
          <span className="flex items-center gap-2"><BellRing className="h-4 w-4 shrink-0 animate-pulse" aria-hidden /> {readyDishes} ready to serve</span>
          <span className="text-[12px] font-medium text-emerald-50">View</span>
        </button>
      )}
      <div role="tablist" aria-label="Table view" className="grid grid-cols-3 gap-1 rounded-xl bg-neutral-100 p-1">
        {(['bill', 'kitchen', 'add'] as const).map((v) => (
          <motion.button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => onView(v)} {...press}
            className={`relative flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-1 text-[13px] font-semibold ${view === v ? 'text-neutral-950' : 'text-neutral-500'}`}>
            {view === v && <motion.span layoutId="table-view-pill" className="absolute inset-0 rounded-lg bg-white shadow-xs" transition={SPRING} />}
            {v === 'kitchen' && readyDishes > 0 && view !== 'kitchen' && <span aria-hidden className="relative h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />}
            <span className="relative">{label(v)}</span>
          </motion.button>
        ))}
      </div>
    </>
  );
}

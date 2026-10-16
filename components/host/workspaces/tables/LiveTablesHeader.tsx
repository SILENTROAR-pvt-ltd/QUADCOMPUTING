'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid } from 'lucide-react';
import { press, SPRING } from '@/components/guest/menu/motion';
import type { TableVisualState } from '@/lib/utils/live-table-state';
import { TABLE_STATE_ORDER, TABLE_STATE_STYLE } from './live-table-style';

export type BoardView = 'tables' | 'orders';
export type BoardFilter = TableVisualState | 'all';

interface LiveTablesHeaderProps {
  view: BoardView;
  onView: (v: BoardView) => void;
  filter: BoardFilter;
  onFilter: (f: BoardFilter) => void;
  counts: Record<TableVisualState, number>;
  total: number;
  /** Orders (kitchen tickets) waiting to be served, and how many of them are ready. */
  orders: number;
  ready: number;
}

/** The page title, the Tables / Orders switch, and (on the table board) the state filter and the "want the bill" shortcut. */
export function LiveTablesHeader({ view, onView, filter, onFilter, counts, total, orders, ready }: LiveTablesHeaderProps) {
  const attention = counts.bill_requested;
  return (
    <header className="min-w-0 rounded-3xl border border-neutral-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-white"><LayoutGrid className="h-5 w-5" /></span>
        <div className="min-w-0">
          <h2 className="font-serif text-2xl leading-tight text-neutral-950">Live Tables</h2>
          <p className="truncate text-xs text-neutral-500">{view === 'tables' ? 'Tap a table for its bill.' : 'Serve each order once it is ready.'}</p>
        </div>
        {view === 'tables' && attention > 0 && (
          <button type="button" onClick={() => onFilter('bill_requested')}
            className="ml-auto inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-sky-600 px-3.5 text-[12px] font-semibold text-white active:scale-95">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> {attention} {attention === 1 ? 'wants' : 'want'} the bill
          </button>
        )}
      </div>

      <div role="tablist" aria-label="Board" className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1">
        {(['tables', 'orders'] as const).map((v) => (
          <motion.button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => onView(v)} {...press}
            className={`relative flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg text-[13px] font-semibold ${view === v ? 'text-neutral-950' : 'text-neutral-500'}`}>
            {view === v && <motion.span layoutId="board-pill" className="absolute inset-0 rounded-lg bg-white shadow-xs" transition={SPRING} />}
            <span className="relative">{v === 'tables' ? `Tables · ${total}` : `Orders · ${orders}`}</span>
            {v === 'orders' && ready > 0 && <span className="relative rounded-full bg-emerald-600 px-1.5 text-[11px] text-white">{ready} ready</span>}
          </motion.button>
        ))}
      </div>

      {view === 'tables' && (
        <ul className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Filter tables by state">
          <li className="shrink-0">
            <button type="button" aria-pressed={filter === 'all'} onClick={() => onFilter('all')}
              className={`inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-semibold ${filter === 'all' ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 bg-white text-neutral-700'}`}>
              All <span className="font-mono">{total}</span>
            </button>
          </li>
          {TABLE_STATE_ORDER.map((s) => (
            <li key={s} className="shrink-0">
              <button type="button" aria-pressed={filter === s} onClick={() => onFilter(filter === s ? 'all' : s)}
                className={`inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-semibold ${filter === s ? 'border-neutral-950 bg-neutral-950 text-white' : `border-transparent ${TABLE_STATE_STYLE[s].chip}`}`}>
                {TABLE_STATE_STYLE[s].label} <span className="font-mono">{counts[s]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}

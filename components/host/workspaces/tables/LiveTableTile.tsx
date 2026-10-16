'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { pressSoft } from '@/components/guest/menu/motion';
import { AnimatedCount } from '@/components/guest/menu/AnimatedCount';
import type { TableVisualState } from '@/lib/utils/live-table-state';
import { TABLE_STATE_STYLE } from './live-table-style';

export interface LiveTableTileProps {
  tableNumber: string;
  seats?: number;
  state: TableVisualState;
  /** The running bill, when there is an order. */
  amount?: number | null;
  itemCount?: number;
  /** Dishes the kitchen has finished and nobody has taken out yet. */
  readyCount?: number;
  selected: boolean;
  onSelect: (tableNumber: string) => void;
}

const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/** One table on the board: its number, its state colour, and the running bill when there is one. */
function LiveTableTileBase({ tableNumber, seats, state, amount, itemCount, readyCount = 0, selected, onSelect }: LiveTableTileProps) {
  const style = TABLE_STATE_STYLE[state];
  const hasBill = state !== 'vacant' && state !== 'settled' && amount !== null && amount !== undefined;
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(tableNumber)}
      {...pressSoft}
      aria-pressed={selected}
      aria-label={`Table ${tableNumber}, ${style.label}${hasBill ? `, bill ${inr(amount as number)}` : ''}${readyCount > 0 ? `, ${readyCount} ready to serve` : ''}`}
      className={`flex min-h-[7rem] w-full flex-col justify-between rounded-2xl border p-3 text-left transition-[transform,box-shadow] cursor-pointer lg:hover:-translate-y-0.5 lg:hover:shadow-md ${style.tile} ${
        selected ? 'outline outline-2 outline-offset-2 outline-neutral-950' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-serif text-2xl leading-none text-neutral-950">{tableNumber}</span>
        <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.chip}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${style.dot} ${style.pulse ? 'animate-pulse' : ''}`} />
          {style.label}
        </span>
      </div>
      {readyCount > 0 && (
        <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
          <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> {readyCount} ready to serve
        </span>
      )}
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className="text-[11px] text-neutral-500">
          {itemCount ? `${itemCount} ${itemCount === 1 ? 'item' : 'items'}` : seats ? `${seats} seats` : ''}
        </span>
        {hasBill && <AnimatedCount value={inr(amount as number)} className="font-mono text-base font-bold text-neutral-950" />}
      </div>
    </motion.button>
  );
}

// A poll that changes one table re-renders only that table's tile.
export const LiveTableTile = React.memo(LiveTableTileBase);

export default LiveTableTile;

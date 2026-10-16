'use client';

import React from 'react';
import type { RestaurantTable } from '@/components/host/workspaces/billing/hooks/usePOSTables';
import type { TableVisualState } from '@/lib/utils/live-table-state';
import { LiveTableTile } from './LiveTableTile';
import { TABLE_STATE_STYLE } from './live-table-style';
import type { BoardFilter } from './LiveTablesHeader';

export interface TableRow { table: RestaurantTable; number: string; state: TableVisualState }

interface LiveTableGridProps {
  /** The first read of the tables is still on its way: placeholders hold the grid's shape instead of "no tables". */
  loading?: boolean;
  rows: TableRow[];
  /** The rows after the state filter. */
  shown: TableRow[];
  filter: BoardFilter;
  onShowAll: () => void;
  readyByTable: Map<string, number>;
  selected: string | null;
  onSelect: (number: string) => void;
}

/** Every table of the venue as a tile, or a plain note when there are none (or none in the chosen state). */
export function LiveTableGrid({ loading = false, rows, shown, filter, onShowAll, readyByTable, selected, onSelect }: LiveTableGridProps) {
  if (loading) {
    return (
      <div role="status" aria-label="Loading tables" className="grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="shimmer min-h-[7rem] rounded-2xl" style={{ animationDelay: `${i * 90}ms` }} />)}
      </div>
    );
  }
  return (
    <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4 2xl:grid-cols-5">
      {rows.length === 0 && (
        <p className="col-span-full rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center text-sm text-neutral-500">
          No tables yet. Add tables in Billing &amp; Tables and they appear here.
        </p>
      )}
      {rows.length > 0 && shown.length === 0 && (
        <p className="col-span-full rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-10 text-center text-sm text-neutral-500">
          No {TABLE_STATE_STYLE[filter as TableVisualState]?.label.toLowerCase()} tables right now.{' '}
          <button type="button" onClick={onShowAll} className="cursor-pointer font-semibold text-neutral-900 underline">Show all</button>
        </p>
      )}
      {shown.map(({ table, number, state }) => (
        <LiveTableTile
          key={table.id || number} tableNumber={number} seats={table.seating_capacity} state={state}
          amount={table.activeSession ? Number(table.activeSession.grandTotal) || 0 : null}
          itemCount={table.activeSession?.itemsCount} readyCount={readyByTable.get(number) ?? 0}
          selected={selected === number} onSelect={onSelect}
        />
      ))}
    </div>
  );
}

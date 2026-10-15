'use client';

import React from 'react';
import { Flame, UtensilsCrossed, Wine } from 'lucide-react';
import { STATIONS, type KitchenStation } from './kitchen-station';

export type BoardTab = 'ACTIVE' | 'READY' | 'SERVED';

interface KitchenBoardFiltersProps {
  tab: BoardTab;
  onTab: (tab: BoardTab) => void;
  activeCount: number;
  /** Tickets the kitchen has marked ready, waiting for the waiter to take them out. */
  readyCount: number;
  servedCount: number;
  station: 'ALL' | KitchenStation;
  onStation: (station: 'ALL' | KitchenStation) => void;
  stationCounts: Record<KitchenStation, number>;
}

const ICON: Record<KitchenStation, React.ReactNode> = {
  Kitchen: <UtensilsCrossed className="h-3.5 w-3.5" />,
  Bar: <Wine className="h-3.5 w-3.5" />,
  Grill: <Flame className="h-3.5 w-3.5" />,
};

const chip = (on: boolean) =>
  `flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold transition-colors cursor-pointer ${
    on ? 'bg-neutral-950 text-white' : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
  }`;

/** Active, ready to serve or served, and which station. Scrolls sideways on a phone instead of wrapping. */
export function KitchenBoardFilters(props: KitchenBoardFiltersProps) {
  const { tab, station, stationCounts } = props;
  const total = STATIONS.reduce((sum, s) => sum + stationCounts[s], 0);
  const waiting = props.readyCount > 0;

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div role="tablist" aria-label="Tickets" className="grid grid-cols-3 gap-1 rounded-xl bg-neutral-100 p-1 md:w-auto">
        {(['ACTIVE', 'READY', 'SERVED'] as const).map((t) => {
          const on = tab === t;
          // Ready is the one the waiter watches: it turns green and shows a pulse while something is waiting to be served.
          const readyAlert = t === 'READY' && waiting;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => props.onTab(t)}
              className={`flex h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors cursor-pointer sm:px-4 ${
                on
                  ? readyAlert ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-neutral-950 shadow-xs'
                  : readyAlert ? 'bg-emerald-50 text-emerald-800' : 'text-neutral-500'
              }`}
            >
              {readyAlert && !on && <span aria-hidden className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />}
              {t === 'ACTIVE' ? `Active · ${props.activeCount}` : t === 'READY' ? `Ready · ${props.readyCount}` : `Served · ${props.servedCount}`}
            </button>
          );
        })}
      </div>

      <div role="group" aria-label="Station" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:pb-0">
        <button type="button" onClick={() => props.onStation('ALL')} aria-pressed={station === 'ALL'} className={chip(station === 'ALL')}>
          All · {total}
        </button>
        {STATIONS.map((s) => (
          <button key={s} type="button" onClick={() => props.onStation(s)} aria-pressed={station === s} className={chip(station === s)}>
            {ICON[s]} {s} · {stationCounts[s]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default KitchenBoardFilters;

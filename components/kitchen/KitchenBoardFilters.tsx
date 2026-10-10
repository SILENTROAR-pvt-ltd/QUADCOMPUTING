'use client';

import React from 'react';
import { Flame, UtensilsCrossed, Wine } from 'lucide-react';
import { STATIONS, type KitchenStation } from './kitchen-station';

export type BoardTab = 'ACTIVE' | 'SERVED';

interface KitchenBoardFiltersProps {
  tab: BoardTab;
  onTab: (tab: BoardTab) => void;
  activeCount: number;
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

/** Active or served, and which station. Scrolls sideways on a phone instead of wrapping. */
export function KitchenBoardFilters(props: KitchenBoardFiltersProps) {
  const { tab, station, stationCounts } = props;
  const total = STATIONS.reduce((sum, s) => sum + stationCounts[s], 0);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div role="tablist" aria-label="Tickets" className="grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1 md:w-auto">
        {(['ACTIVE', 'SERVED'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => props.onTab(t)}
            className={`h-10 rounded-lg px-4 text-xs font-semibold transition-colors cursor-pointer ${
              tab === t ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-500'
            }`}
          >
            {t === 'ACTIVE' ? `Active · ${props.activeCount}` : `Served · ${props.servedCount}`}
          </button>
        ))}
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

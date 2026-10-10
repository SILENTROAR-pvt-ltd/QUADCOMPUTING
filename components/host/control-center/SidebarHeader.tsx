'use client';

import React from 'react';
import { MasterSessionControl } from './MasterSessionControl';

interface SidebarHeaderProps {
  venueName: string;
  venueId: string;
  masterPinOn: boolean;
  unlocked: boolean;
  onLock: () => void;
  onUnlock: () => void;
}

/** Brand, live status, the venue being managed and the master session control. */
export function SidebarHeader({ venueName, venueId, masterPinOn, unlocked, onLock, onUnlock }: SidebarHeaderProps) {
  return (
    <div className="space-y-4 border-b border-neutral-100 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-neutral-950 text-[13px] font-bold text-white">Q</span>
          <div className="leading-tight">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-900">Quad Computing</p>
            <p className="text-[10px] text-neutral-400">Host console</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Live
        </span>
      </div>

      <div className="rounded-xl border border-neutral-200/70 bg-neutral-50 px-3.5 py-3">
        <h1 className="truncate font-serif text-base font-medium tracking-tight text-neutral-950">{venueName}</h1>
        <p className="mt-0.5 font-mono text-[10px] text-neutral-400">ID {venueId.slice(0, 8)}…{venueId.slice(-4)}</p>
      </div>

      {masterPinOn && <MasterSessionControl unlocked={unlocked} onLock={onLock} onUnlock={onUnlock} />}
    </div>
  );
}

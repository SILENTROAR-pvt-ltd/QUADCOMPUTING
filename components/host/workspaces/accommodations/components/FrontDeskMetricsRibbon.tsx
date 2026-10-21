'use client';

import React from 'react';
import { ROOM_STATUS_STYLE, inr } from '../room-status-style';

interface FrontDeskMetricsRibbonProps {
  total: number;
  vacant: number;
  /** Free rooms a booking is holding. */
  reserved: number;
  occupied: number;
  cleaning: number;
  maintenance: number;
  occupancyRate: number;
  totalFolioBilling: number;
  totalKOTs: number;
  isLoading?: boolean;
}

function Tile({ label, value, hint, dot }: { label: string; value: string; hint: string; dot?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">
        {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}{label}
      </p>
      <p className="mt-1.5 font-serif text-2xl tabular-nums text-neutral-950">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-neutral-500">{hint}</p>
    </div>
  );
}

/** The front desk at a glance: occupancy, rooms by status, and room service not yet paid. */
export function FrontDeskMetricsRibbon(p: FrontDeskMetricsRibbonProps) {
  if (p.isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7" aria-busy="true">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => <div key={i} className="h-[98px] animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100/70" />)}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      <Tile label="Occupancy" value={`${p.occupancyRate}%`} hint={`${p.occupied} of ${p.total} rooms`} />
      <Tile label="Vacant" value={String(p.vacant)} hint="Ready to check in" dot={ROOM_STATUS_STYLE.VACANT.dot} />
      <Tile label="Reserved" value={String(p.reserved)} hint="Held for arrivals" dot={ROOM_STATUS_STYLE.RESERVED.dot} />
      <Tile label="Occupied" value={String(p.occupied)} hint="Guests in house" dot={ROOM_STATUS_STYLE.OCCUPIED.dot} />
      <Tile label="Housekeeping" value={String(p.cleaning)} hint="Being turned around" dot={ROOM_STATUS_STYLE.CLEANING.dot} />
      <Tile label="On hold" value={String(p.maintenance)} hint="Maintenance" dot={ROOM_STATUS_STYLE.MAINTENANCE.dot} />
      <Tile label="Room service due" value={inr(p.totalFolioBilling)} hint={`${p.totalKOTs} unpaid order${p.totalKOTs === 1 ? '' : 's'}`} />
    </div>
  );
}

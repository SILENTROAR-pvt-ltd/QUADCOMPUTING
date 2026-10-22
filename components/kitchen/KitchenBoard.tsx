'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useKitchenRealtime } from '@/lib/hooks/use-kitchen-realtime';
import type { KitchenTicket } from '@/lib/utils/kitchen';
import { resolveStation, type KitchenStation } from './kitchen-station';
import { ringAlert } from '@/lib/host-alert-sound';
import { KitchenBoardHeader } from './KitchenBoardHeader';
import { KitchenBoardFilters, type BoardTab } from './KitchenBoardFilters';
import { KitchenStationSetup } from './KitchenStationSetup';
import { KotTicketCard } from './KotTicketCard';

export { resolveStation };
export type { KitchenStation };

interface KitchenBoardProps {
  businessId?: string;
  stationFilter?: 'ALL' | KitchenStation;
  className?: string;
  /** Read the tickets this often as well (a PIN-signed-in kitchen tablet has no realtime channel). */
  pollMs?: number;
}

const TICK_MS = 20_000;
const isActive = (t: KitchenTicket) => t.status !== 'SERVED' && t.status !== 'CANCELLED';
const time = (iso?: string) => Date.parse(iso || '') || 0;

/** The live kitchen: one card per ticket, oldest first, with every dish and when each stage happened. */
export function KitchenBoard({ businessId, stationFilter = 'ALL', className = '', pollMs }: KitchenBoardProps) {
  const [station, setStation] = useState<'ALL' | KitchenStation>(stationFilter);
  const [tab, setTab] = useState<BoardTab>('ACTIVE');
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const onNewTicket = useCallback((ticket: KitchenTicket) => {
    // The same bell as the control center rings; it ignores a second ring for the same event.
    if (ticket.status === 'PENDING') ringAlert();
  }, []);

  const { tickets, isLoading, isSubscribed, error, refetch, updateTicketStatus, toggleItemDone } =
    useKitchenRealtime({ businessId, onNewTicket, pollMs });

  const inTab = useMemo(
    () => tickets.filter((t) => (tab === 'ACTIVE' ? isActive(t) : tab === 'READY' ? t.status === 'READY' : t.status === 'SERVED')),
    [tickets, tab]
  );
  const stationCounts = useMemo(() => {
    const counts: Record<KitchenStation, number> = { Kitchen: 0, Bar: 0, Grill: 0 };
    for (const t of inTab) counts[resolveStation(t)] += 1;
    return counts;
  }, [inTab]);
  const visible = useMemo(() => {
    const list = inTab.filter((t) => station === 'ALL' || resolveStation(t) === station);
    // Active: oldest first, the order the kitchen works in. Ready: the one waiting longest first, so it is served first.
    // Served: most recent first.
    return list.sort((a, b) => {
      if (tab === 'ACTIVE') return time(a.created_at) - time(b.created_at);
      if (tab === 'READY') return time(a.updated_at || a.created_at) - time(b.updated_at || b.created_at);
      return time(b.updated_at || b.created_at) - time(a.updated_at || a.created_at);
    });
  }, [inTab, station, tab]);
  const activeCount = useMemo(() => tickets.filter(isActive).length, [tickets]);
  const readyCount = useMemo(() => tickets.filter((t) => t.status === 'READY').length, [tickets]);
  const servedCount = useMemo(() => tickets.filter((t) => t.status === 'SERVED').length, [tickets]);

  return (
    <div className={`flex flex-col gap-4 sm:gap-5 ${className}`}>
      <KitchenBoardHeader
        isSubscribed={isSubscribed}
        isLoading={isLoading}
        onRefresh={() => refetch()}
      />

      <KitchenStationSetup />

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" /> {error}
        </div>
      )}

      <KitchenBoardFilters
        tab={tab}
        onTab={setTab}
        activeCount={activeCount}
        readyCount={readyCount}
        servedCount={servedCount}
        station={station}
        onStation={setStation}
        stationCounts={stationCounts}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-80 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100/60" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
          <p className="font-serif text-lg text-neutral-900">
            {tab === 'ACTIVE' ? 'No orders waiting' : tab === 'READY' ? 'Nothing ready to serve' : 'Nothing served yet'}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {tab === 'ACTIVE'
              ? 'New orders appear here the moment a guest sends them.'
              : tab === 'READY'
                ? 'Dishes show up here the moment the kitchen marks them ready; the waiter takes them out from Live Tables.'
                : 'Served tickets are kept here for the day.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map((ticket) => (
            <KotTicketCard
              key={ticket.id}
              ticket={ticket}
              station={resolveStation(ticket)}
              nowMs={nowMs}
              onStatus={updateTicketStatus}
              onToggleItem={toggleItemDone}
            />
          ))}
        </div>
      )}
    </div>
  );
}

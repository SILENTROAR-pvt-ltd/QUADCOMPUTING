'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { usePOSTables, type RestaurantTable } from '@/components/host/workspaces/billing/hooks/usePOSTables';
import { useKitchenRealtime } from '@/lib/hooks/use-kitchen-realtime';
import { activeTickets } from '@/lib/utils/table-kitchen';
import { LiveTableGrid } from './LiveTableGrid';
import { LiveTableControlPanel } from './LiveTableControlPanel';
import { LiveTablesHeader, type BoardFilter, type BoardView } from './LiveTablesHeader';
import { LiveOrdersBoard } from './LiveOrdersBoard';
import { ReadyBar } from './ReadyBar';
import { LiveTableSheet } from './LiveTableSheet';
import { useSettledAt } from './useSettledAt';
import { useBoardRows } from './useBoardRows';
import { useWaiterCanSettle } from './useWaiterCanSettle';
import { useOpenTableRequest } from '@/lib/host/useOpenTableRequest';

interface LiveTablesWorkspaceProps {
  venueId: string;
  onNavigate?: (tab: string) => void;
  /** Read the tables and the kitchen this often (a PIN-signed-in waiter phone has no realtime channel). */
  pollMs?: number;
}

/** The kitchen feed is live; this slower re-read only catches a dropped connection. */
const KITCHEN_REFRESH_MS = 15_000;

/** The waiter's dashboard: a bar of orders ready to serve, every table with its bill and kitchen, and every order waiting. */
export function LiveTablesWorkspace({ venueId, onNavigate, pollMs }: LiveTablesWorkspaceProps) {
  const { tables, fetchTables, loaded } = usePOSTables(venueId, { pollMs });
  // One live kitchen feed for the whole page: a chef's change reaches every tile, panel and order box at once.
  const kitchen = useKitchenRealtime({ businessId: venueId, pollMs });
  const { refetch: refetchKitchen, updateTicketStatus } = kitchen;
  const { settledAt, reload: reloadSettled } = useSettledAt();
  const canSettle = useWaiterCanSettle();
  const board = useBoardRows(tables as RestaurantTable[], settledAt, kitchen.tickets);
  const [view, setView] = useState<BoardView>('tables');
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<BoardFilter>('all');

  // A staff phone already reads the kitchen through its push channel and its own timer, so this one is for the owner only.
  useEffect(() => {
    if (pollMs) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refetchKitchen(); }, KITCHEN_REFRESH_MS);
    return () => clearInterval(timer);
  }, [refetchKitchen, pollMs]);

  const orders = useMemo(() => activeTickets(kitchen.tickets), [kitchen.tickets]);
  const shown = useMemo(() => (filter === 'all' ? board.rows : board.rows.filter((r) => r.state === filter)), [board.rows, filter]);
  const chosen = board.rows.find((r) => r.number === selected) ?? null;
  const select = useCallback((number: string) => setSelected(number), []);
  const close = useCallback(() => setSelected(null), []);
  // A table named from the bell ("Table T-03 wants the waiter") opens here as soon as the tables are known.
  useOpenTableRequest(tables as RestaurantTable[], useCallback((t: RestaurantTable) => { setView('tables'); setSelected(t.table_number); }, []));
  // The kitchen feed shows a served order as served at once and rolls it back if it could not be saved.
  const serve = useCallback((id: string) => updateTicketStatus(id, 'SERVED'), [updateTicketStatus]);

  // A table the waiter settled or freed turns over at once; the real state replaces it when the lists are read again.
  const { turnOver, clearTurnOver } = board;
  const finished = useCallback((number: string, kind: 'release' | 'settle') => {
    turnOver(number, kind === 'settle' ? 'settled' : 'vacant');
    setSelected(null);
    void Promise.all([fetchTables(), reloadSettled(), refetchKitchen()]).then(() => clearTurnOver(number));
  }, [turnOver, clearTurnOver, fetchTables, reloadSettled, refetchKitchen]);

  // A phone shows the table as a sheet over the board: Escape closes it, and the board behind does not scroll.
  useEffect(() => {
    if (!chosen || view !== 'tables') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    const small = window.matchMedia('(max-width: 1023px)').matches;
    const previous = document.body.style.overflow;
    if (small) document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [chosen, view]);

  return (
    <section aria-label="Live tables" className="min-w-0 space-y-4 pb-6 sm:space-y-5">
      <LiveTablesHeader view={view} onView={setView} filter={filter} onFilter={setFilter} counts={board.counts} total={board.rows.length}
        orders={orders.length} ready={orders.filter((t) => t.status === 'READY').length} />

      {view === 'tables' && <ReadyBar tickets={kitchen.tickets} onServe={serve} onOpenOrders={() => setView('orders')} />}

      {view === 'orders' ? (
        <LiveOrdersBoard tickets={kitchen.tickets} loading={kitchen.isLoading} onServe={serve} />
      ) : (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <LiveTableGrid loading={!loaded && board.rows.length === 0} rows={board.rows} shown={shown} filter={filter} onShowAll={() => setFilter('all')}
            readyByTable={board.readyByTable} selected={selected} onSelect={select} />

          <LiveTableSheet open={Boolean(chosen)} onClose={close}>
            {chosen ? (
              <LiveTableControlPanel
                key={chosen.number} venueId={venueId} tableNumber={chosen.number} state={chosen.state}
                kitchenTickets={kitchen.tickets} kitchenLoading={kitchen.isLoading} onServeTicket={serve}
                onChanged={() => { void fetchTables(); }} onFinished={(kind) => finished(chosen.number, kind)}
                onOpenBilling={() => onNavigate?.('billing')} onClose={close} canSettle={canSettle}
              />
            ) : (
              <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
                Select a table to see its bill and what the kitchen is doing, add items, and settle it.
              </div>
            )}
          </LiveTableSheet>
        </div>
      )}
    </section>
  );
}

export default LiveTablesWorkspace;

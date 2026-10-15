'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { usePOSTables, type RestaurantTable } from '@/components/host/workspaces/billing/hooks/usePOSTables';
import { useKitchenRealtime } from '@/lib/hooks/use-kitchen-realtime';
import { kitchenSummary, ticketsForTable } from '@/lib/utils/table-kitchen';
import { latestSettledByTable, normalizeTableNumber, tableVisualState, type TableVisualState } from '@/lib/utils/live-table-state';
import { LiveTableTile } from './LiveTableTile';
import { LiveTableControlPanel } from './LiveTableControlPanel';
import { TABLE_STATE_ORDER, TABLE_STATE_STYLE } from './live-table-style';

interface LiveTablesWorkspaceProps {
  venueId: string;
  onNavigate?: (tab: string) => void;
}

const SETTLED_REFRESH_MS = 60_000;
/** The kitchen feed is live; this slower re-read only catches a dropped connection. */
const KITCHEN_REFRESH_MS = 15_000;

/** Every table of the venue on one page: its state at a glance, and the selected table's bill to act on. */
export function LiveTablesWorkspace({ venueId, onNavigate }: LiveTablesWorkspaceProps) {
  const { tables, fetchTables } = usePOSTables(venueId);
  // One live kitchen feed for the whole page: a chef's change reaches every table's tile and panel at once.
  const kitchen = useKitchenRealtime({ businessId: venueId });
  const refetchKitchen = kitchen.refetch;
  const [settledAt, setSettledAt] = useState<Map<string, number>>(new Map());
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<TableVisualState | 'all'>('all');
  // A table just settled or freed turns over at once, before the refreshed list arrives.
  const [turnedOver, setTurnedOver] = useState<Map<string, TableVisualState>>(new Map());

  // Recently settled tables come from the order history, refreshed on its own slower clock.
  const loadSettled = useCallback(async () => {
    try {
      const res = await fetch('/api/host/orders/history?limit=300', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setSettledAt(latestSettledByTable(Array.isArray(data.orders) ? data.orders : []));
    } catch {
      // Settled tables are a hint; the board still works without them.
    }
  }, []);

  useEffect(() => {
    void loadSettled();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void loadSettled(); }, SETTLED_REFRESH_MS);
    return () => clearInterval(timer);
  }, [loadSettled]);

  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refetchKitchen(); }, KITCHEN_REFRESH_MS);
    return () => clearInterval(timer);
  }, [refetchKitchen]);

  const rows = useMemo(() => {
    const now = Date.now();
    return (tables as RestaurantTable[])
      .map((t) => {
        const number = t.table_number || '';
        const key = normalizeTableNumber(number);
        const state: TableVisualState = turnedOver.get(key) ?? tableVisualState(t, settledAt.get(key) ?? null, now);
        return { table: t, number, state };
      })
      .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' }));
  }, [tables, settledAt, turnedOver]);

  // Dishes ready to serve, per table, from the same live feed the panel reads.
  const readyByTable = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const ready = kitchenSummary(ticketsForTable(kitchen.tickets, r.number, null)).readyDishes;
      if (ready > 0) map.set(r.number, ready);
    }
    return map;
  }, [rows, kitchen.tickets]);

  const counts = useMemo(() => {
    const c: Record<TableVisualState, number> = { live: 0, bill_requested: 0, occupied: 0, settled: 0, vacant: 0 };
    for (const r of rows) c[r.state] += 1;
    return c;
  }, [rows]);

  const shown = useMemo(() => (filter === 'all' ? rows : rows.filter((r) => r.state === filter)), [rows, filter]);
  const chosen = rows.find((r) => r.number === selected) ?? null;
  const select = useCallback((number: string) => setSelected(number), []);
  const close = useCallback(() => setSelected(null), []);

  // A line or an item changed: only the tables are read again, not the history.
  const tablesChanged = useCallback(() => { void fetchTables(); }, [fetchTables]);

  // Only an unstarted table is freed from here; settling a bill is the cashier's, in billing.
  const finished = useCallback((number: string) => {
    const key = normalizeTableNumber(number);
    setTurnedOver((m) => new Map(m).set(key, 'vacant'));
    setSelected(null);
    void fetchTables().then(() => {
      setTurnedOver((m) => { const next = new Map(m); next.delete(key); return next; });
    });
  }, [fetchTables]);

  // A phone shows the table as a sheet over the board: Escape closes it, and the board behind does not scroll.
  useEffect(() => {
    if (!chosen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    const small = window.matchMedia('(max-width: 1023px)').matches;
    const previous = document.body.style.overflow;
    if (small) document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [chosen]);

  const attention = counts.bill_requested;

  return (
    <section aria-label="Live tables" className="min-w-0 space-y-4 pb-6 sm:space-y-5">
      <header className="min-w-0 rounded-3xl border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-white">
            <LayoutGrid className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-serif text-2xl leading-tight text-neutral-950">Live Tables</h2>
            <p className="truncate text-xs text-neutral-500">Tap a table for its bill.</p>
          </div>
          {attention > 0 && (
            <button
              type="button"
              onClick={() => setFilter('bill_requested')}
              className="ml-auto inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-sky-600 px-3.5 text-[12px] font-semibold text-white active:scale-95"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> {attention} {attention === 1 ? 'wants' : 'want'} the bill
            </button>
          )}
        </div>

        <ul className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Filter tables by state">
          <li className="shrink-0">
            <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}
              className={`inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-semibold ${filter === 'all' ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-200 bg-white text-neutral-700'}`}>
              All <span className="font-mono">{rows.length}</span>
            </button>
          </li>
          {TABLE_STATE_ORDER.map((s) => (
            <li key={s} className="shrink-0">
              <button type="button" aria-pressed={filter === s} onClick={() => setFilter(filter === s ? 'all' : s)}
                className={`inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-semibold ${filter === s ? 'border-neutral-950 bg-neutral-950 text-white' : `border-transparent ${TABLE_STATE_STYLE[s].chip}`}`}>
                {TABLE_STATE_STYLE[s].label} <span className="font-mono">{counts[s]}</span>
              </button>
            </li>
          ))}
        </ul>
      </header>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4 2xl:grid-cols-5">
          {rows.length === 0 && (
            <p className="col-span-full rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center text-sm text-neutral-500">
              No tables yet. Add tables in Billing &amp; Tables and they appear here.
            </p>
          )}
          {rows.length > 0 && shown.length === 0 && (
            <p className="col-span-full rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-10 text-center text-sm text-neutral-500">
              No {TABLE_STATE_STYLE[filter as TableVisualState]?.label.toLowerCase()} tables right now.{' '}
              <button type="button" onClick={() => setFilter('all')} className="cursor-pointer font-semibold text-neutral-900 underline">Show all</button>
            </p>
          )}
          {shown.map(({ table, number, state }) => (
            <LiveTableTile
              key={table.id || number}
              tableNumber={number}
              seats={table.seating_capacity}
              state={state}
              amount={table.activeSession ? Number(table.activeSession.grandTotal) || 0 : null}
              itemCount={table.activeSession?.itemsCount}
              readyCount={readyByTable.get(number) ?? 0}
              selected={selected === number}
              onSelect={select}
            />
          ))}
        </div>

        {/* A sheet over the board on a phone; a sticky column beside it on a desk. */}
        <div
          className={`${chosen ? 'fixed inset-0 z-[80] flex items-end bg-black/45' : 'hidden'} lg:sticky lg:top-6 lg:z-auto lg:block lg:bg-transparent`}
          onClick={close}
        >
          <div className="h-[92dvh] w-full lg:h-auto" onClick={(e) => e.stopPropagation()}>
            {chosen ? (
              <LiveTableControlPanel
                key={chosen.number}
                venueId={venueId}
                tableNumber={chosen.number}
                state={chosen.state}
                kitchenTickets={kitchen.tickets}
                kitchenLoading={kitchen.isLoading}
                onServeTicket={(id) => kitchen.updateTicketStatus(id, 'SERVED')}
                onChanged={tablesChanged}
                onFinished={() => finished(chosen.number)}
                onOpenBilling={() => onNavigate?.('billing')}
                onClose={close}
              />
            ) : (
              <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
                Select a table to see its bill, what the kitchen has started, and to remove an item that has not been started.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default LiveTablesWorkspace;

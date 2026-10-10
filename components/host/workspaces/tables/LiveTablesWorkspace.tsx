'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { usePOSTables, type RestaurantTable } from '@/components/host/workspaces/billing/hooks/usePOSTables';
import { latestSettledByTable, normalizeTableNumber, tableVisualState, type TableVisualState } from '@/lib/utils/live-table-state';
import { LiveTableTile } from './LiveTableTile';
import { LiveTableControlPanel } from './LiveTableControlPanel';
import { TABLE_STATE_ORDER, TABLE_STATE_STYLE } from './live-table-style';

interface LiveTablesWorkspaceProps {
  venueId: string;
  onNavigate?: (tab: string) => void;
}

const SETTLED_REFRESH_MS = 60_000;

/** Every table of the venue on one page: its state at a glance, and the selected table's bill to act on. */
export function LiveTablesWorkspace({ venueId, onNavigate }: LiveTablesWorkspaceProps) {
  const { tables, fetchTables } = usePOSTables(venueId);
  const [settledAt, setSettledAt] = useState<Map<string, number>>(new Map());
  const [selected, setSelected] = useState<string | null>(null);

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

  const rows = useMemo(() => {
    const now = Date.now();
    return (tables as RestaurantTable[])
      .map((t) => {
        const number = t.table_number || '';
        const state: TableVisualState = tableVisualState(t, settledAt.get(normalizeTableNumber(number)) ?? null, now);
        return { table: t, number, state };
      })
      .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' }));
  }, [tables, settledAt]);

  const counts = useMemo(() => {
    const c: Record<TableVisualState, number> = { live: 0, bill_requested: 0, occupied: 0, settled: 0, vacant: 0 };
    for (const r of rows) c[r.state] += 1;
    return c;
  }, [rows]);

  const chosen = rows.find((r) => r.number === selected) ?? null;
  const refreshAll = useCallback(() => { void fetchTables(); void loadSettled(); }, [fetchTables, loadSettled]);

  return (
    <section aria-label="Live tables" className="space-y-5">
      <header className="flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-950 text-white">
            <LayoutGrid className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-serif text-2xl text-neutral-950">Live Tables</h2>
            <p className="text-xs text-neutral-500">Every table, what it is doing, and its running bill.</p>
          </div>
        </div>
        <ul className="flex flex-wrap gap-2" aria-label="Table states">
          {TABLE_STATE_ORDER.map((s) => (
            <li key={s} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${TABLE_STATE_STYLE[s].chip}`}>
              {TABLE_STATE_STYLE[s].label} <span className="font-mono">{counts[s]}</span>
            </li>
          ))}
        </ul>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {rows.length === 0 && (
            <p className="col-span-full rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center text-sm text-neutral-500">
              No tables yet. Add tables in Billing &amp; Tables and they appear here.
            </p>
          )}
          {rows.map(({ table, number, state }) => (
            <LiveTableTile
              key={table.id || number}
              tableNumber={number}
              seats={table.seating_capacity}
              state={state}
              amount={table.activeSession ? Number(table.activeSession.grandTotal) || 0 : null}
              itemCount={table.activeSession?.itemsCount}
              selected={selected === number}
              onSelect={() => setSelected(number)}
            />
          ))}
        </div>

        <div className="lg:sticky lg:top-6">
          {chosen ? (
            <LiveTableControlPanel
              key={chosen.number}
              venueId={venueId}
              tableNumber={chosen.number}
              state={chosen.state}
              onChanged={refreshAll}
              onOpenBilling={() => onNavigate?.('billing')}
              onClose={() => setSelected(null)}
            />
          ) : (
            <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
              Select a table to see its bill, what the kitchen has started, and to remove an item that has not been started.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default LiveTablesWorkspace;

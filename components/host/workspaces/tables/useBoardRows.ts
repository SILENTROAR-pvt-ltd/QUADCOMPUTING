'use client';

import { useMemo, useState } from 'react';
import type { RestaurantTable } from '@/components/host/workspaces/billing/hooks/usePOSTables';
import type { KitchenTicket } from '@/lib/utils/kitchen';
import { kitchenSummary, ticketsForTable } from '@/lib/utils/table-kitchen';
import { normalizeTableNumber, tableVisualState, type TableVisualState } from '@/lib/utils/live-table-state';

/**
 * The board's tables with their state, in table order, and the figures drawn from them: how many are in each state, and
 * how many dishes are ready per table. A table just settled or freed turns over at once (`turnOver`), before the
 * refreshed lists arrive, and `clearTurnOver` drops that again.
 */
export function useBoardRows(tables: RestaurantTable[], settledAt: Map<string, number>, tickets: KitchenTicket[]) {
  const [turnedOver, setTurnedOver] = useState<Map<string, TableVisualState>>(new Map());
  // When the waiter marked a table vacant here: a "Settled" from before that is done with, so the table shows vacant.
  const [freedAt, setFreedAt] = useState<Map<string, number>>(new Map());

  const rows = useMemo(() => {
    const now = Date.now();
    return tables
      .map((t) => {
        const number = t.table_number || '';
        const key = normalizeTableNumber(number);
        const paid = settledAt.get(key) ?? null;
        const stillSettled = paid !== null && paid > (freedAt.get(key) ?? 0) ? paid : null;
        return { table: t, number, state: turnedOver.get(key) ?? tableVisualState(t, stillSettled, now) };
      })
      .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' }));
  }, [tables, settledAt, turnedOver, freedAt]);

  const readyByTable = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const ready = kitchenSummary(ticketsForTable(tickets, r.number, null)).readyDishes;
      if (ready > 0) map.set(r.number, ready);
    }
    return map;
  }, [rows, tickets]);

  const counts = useMemo(() => {
    const c: Record<TableVisualState, number> = { live: 0, bill_requested: 0, occupied: 0, settled: 0, vacant: 0 };
    for (const r of rows) c[r.state] += 1;
    return c;
  }, [rows]);

  return {
    rows, readyByTable, counts,
    turnOver: (number: string, state: TableVisualState) => {
      const key = normalizeTableNumber(number);
      if (state === 'vacant') setFreedAt((m) => new Map(m).set(key, Date.now()));
      setTurnedOver((m) => new Map(m).set(key, state));
    },
    clearTurnOver: (number: string) => setTurnedOver((m) => { const next = new Map(m); next.delete(normalizeTableNumber(number)); return next; }),
  };
}

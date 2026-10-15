'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import type { BillLine } from './LiveTableLine';
import type { TableSessionFacts, TableOrderFacts } from '@/lib/utils/table-guest';

type BillOrder = (TableOrderFacts & { id?: string; subtotal?: number; tax_amount?: number; grand_total?: number }) | null;
type BillSession = (TableSessionFacts & { id?: string; status?: string }) | null;

interface BillResponse {
  items: BillLine[];
  order: BillOrder;
  session: BillSession;
}

interface Snapshot { lines: BillLine[]; order: BillOrder; session: BillSession }

// The last bill seen for each table. Opening a table shows it at once while the fresh one loads behind it, so a
// waiter tapping from table to table never waits on a spinner for a bill they looked at a minute ago.
const SNAPSHOTS = new Map<string, Snapshot>();
const MAX_SNAPSHOTS = 40;
const remember = (key: string, snap: Snapshot) => {
  SNAPSHOTS.delete(key);
  SNAPSHOTS.set(key, snap);
  if (SNAPSHOTS.size > MAX_SNAPSHOTS) SNAPSHOTS.delete(SNAPSHOTS.keys().next().value as string);
};

/** The order's totals after a line's money changes by `delta`, keeping the bill's tax rate, until the server's figures arrive. */
export function shifted(order: BillOrder, delta: number): BillOrder {
  if (!order) return order;
  const sub = Number(order.subtotal) || 0;
  const grand = Number(order.grand_total) || sub;
  const ratio = sub > 0 ? grand / sub : 1;
  const next = Math.max(0, sub + delta);
  return { ...order, subtotal: next, grand_total: Math.round(next * ratio * 100) / 100, tax_amount: Math.round(next * (ratio - 1) * 100) / 100 };
}

/** A table's live bill and session, with changing and removing lines the kitchen has not started. */
export function useTableBill(venueId: string, tableNumber: string, onChanged: () => void) {
  const key = `${venueId}:${tableNumber}`;
  const cached = SNAPSHOTS.get(key);
  const [lines, setLines] = useState<BillLine[]>(cached?.lines ?? []);
  const [order, setOrder] = useState<BillOrder>(cached?.order ?? null);
  const [session, setSession] = useState<BillSession>(cached?.session ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [busyLine, setBusyLine] = useState<string | null>(null);
  // True from a change until the server's own figures are back: settling waits for it, so the amount taken is the real one.
  const [syncing, setSyncing] = useState(false);
  // False while a remembered bill is on screen and the real one has not arrived yet.
  const [fresh, setFresh] = useState(false);
  const latest = useRef(0);

  const load = useCallback(async () => {
    const mine = ++latest.current;
    // A fresh key on every read: the sessions endpoint replays identical requests for a short window,
    // which would show a changed line as it was.
    const result = await apiRequest<BillResponse>('/api/host/sessions', jsonRequest('POST', {
      table_number: tableNumber,
      business_id: venueId,
      idempotency_key: `bill-${tableNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }));
    if (mine !== latest.current) return;
    if (result.ok && result.data) {
      const items = (Array.isArray(result.data.items) ? result.data.items : []).filter((l) => String(l.kot_status ?? '').toLowerCase() !== 'cancelled');
      setLines(items);
      setOrder(result.data.order ?? null);
      setSession(result.data.session ?? null);
      setError(null);
      setFresh(true);
      remember(key, { lines: items, order: result.data.order ?? null, session: result.data.session ?? null });
    } else if (!result.ok) {
      setError(result.error);
    }
    setLoading(false);
  }, [tableNumber, venueId, key]);

  useEffect(() => {
    void load();
  }, [load]);

  const linesRef = useRef<BillLine[]>(lines);
  linesRef.current = lines;
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  // Reads the real bill again behind a change; settling stays locked until that is back and no tap is still waiting.
  const resync = useCallback(() => {
    void load().finally(() => { if (timers.current.size === 0) setSyncing(false); });
  }, [load]);

  // A change shows at once. Taps on one line within a moment are sent as one request with the final quantity, and
  // a change the server refuses is undone by reading the real bill again.
  const changeLine = async (line: BillLine, quantity: number) => {
    const current = linesRef.current.find((l) => l.id === line.id);
    if (!current) return false;
    const next = Math.max(0, quantity);
    const delta = (next - Number(current.quantity)) * Number(current.price);
    setError(null);
    setSyncing(true);
    setOrder((cur) => shifted(cur, delta));

    const pending = timers.current.get(line.id);
    if (pending) { clearTimeout(pending); timers.current.delete(line.id); }

    if (next <= 0) {
      setLines((cur) => cur.filter((l) => l.id !== line.id));
      setBusyLine(line.id);
      const result = await apiRequest('/api/host/tables/lines', jsonRequest('POST', { order_item_id: line.id }));
      setBusyLine(null);
      if (!result.ok) setError(result.error);
      else onChanged();
      resync();
      return result.ok;
    }

    setLines((cur) => cur.map((l) => (l.id === line.id ? { ...l, quantity: next } : l)));
    timers.current.set(line.id, setTimeout(async () => {
      timers.current.delete(line.id);
      const wanted = linesRef.current.find((l) => l.id === line.id)?.quantity ?? next;
      const result = await apiRequest('/api/host/tables/lines', jsonRequest('PATCH', { order_item_id: line.id, quantity: wanted }));
      if (!result.ok) setError(result.error);
      else onChanged();
      resync();
    }, 350));
    return true;
  };

  return { lines, order, session, loading, error, busyLine, syncing, fresh, reload: load, changeLine, setError };
}

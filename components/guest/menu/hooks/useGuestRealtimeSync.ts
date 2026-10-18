'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { guestTableChannel } from '@/lib/realtime/channels';
import { normalizeTableIdentifier } from './order-totals.util';

interface RealtimeSyncProps {
  businessId?: string; tableNumber: string; masterOrderId?: string;
  markBillSettled: (settledAmount?: number) => void; resetSettledState?: () => void;
  setKotStatus: (status: string) => void; setTicketNumber: (ticket: string) => void;
  /** The table's bill, session or tickets changed: read the order now. */
  onTableChanged?: () => void;
}

/** Burst of table changes (one order touches several rows) becomes one read. */
const CHANGED_COALESCE_MS = 300;

/** Returns whether the push channel is up, so the polling safety net can slow down while it is. */
export function useGuestRealtimeSync(props: RealtimeSyncProps): boolean {
  const [connected, setConnected] = useState(false);
  // Handlers read the latest callbacks through a ref: markBillSettled & co. are
  // rebuilt on every order-state change (every poll), and depending on them
  // tore the channel down and re-subscribed it each time, dropping pushes.
  const latest = useRef(props);
  latest.current = props;
  const { businessId, tableNumber } = props;

  useEffect(() => {
    if (!tableNumber) return;
    const supabase = createClient(), normCurrent = normalizeTableIdentifier(tableNumber);
    // A settlement on this table is this phone's only when it has an order and the settled bill is that order (a push
    // that names no order is taken as the table's one bill). A new party's phone never shows the last party's bill as paid.
    const markBillSettled = (amount?: number, orderId?: string | null) => {
      const { masterOrderId } = latest.current;
      if (!masterOrderId || (orderId && orderId !== masterOrderId)) return;
      latest.current.markBillSettled(amount);
    };

    const handleKot = (targetTable?: string, orderId?: string, status?: string, ticket?: string) => {
      const { masterOrderId, setKotStatus, setTicketNumber } = latest.current;
      const normTarget = targetTable ? normalizeTableIdentifier(targetTable) : '';
      if (normTarget && normTarget !== normCurrent) return;
      if (!normTarget && (!masterOrderId || orderId !== masterOrderId)) return;
      if (status) setKotStatus(status);
      if (ticket) setTicketNumber(ticket);
    };

    const handleOrderStatus = (targetTable?: string, orderId?: string, status?: string, amount?: number) => {
      const { masterOrderId, resetSettledState, setKotStatus } = latest.current;
      const normTarget = targetTable ? normalizeTableIdentifier(targetTable) : '';
      if (normTarget && normTarget !== normCurrent) return;
      if (!normTarget && (!masterOrderId || orderId !== masterOrderId)) return;
      const s = (status || '').toLowerCase();
      if (['settled', 'paid', 'completed'].includes(s)) {
        markBillSettled(amount, orderId);
      } else {
        // Another order at the table moving on says nothing about this phone's bill.
        if (orderId && masterOrderId && orderId !== masterOrderId) return;
        resetSettledState?.();
        if (status) setKotStatus(status.toUpperCase());
      }
    };

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('quad_kitchen_sync');
        bc.onmessage = (e) => {
          const p = e.data?.payload;
          if (e.data?.event === 'kot_status_update' && p) handleKot(p.table_number || p.table_or_room, p.order_id, p.status, p.ticket_number);
          if (e.data?.event === 'order_status_updated' && p) handleOrderStatus(p.table_number || p.table_or_room, p.order_id, p.status, p.settled_total);
          if (e.data?.event === 'table_settled' && p) handleOrderStatus(p.table_number, p.order_id, 'settled', p.settled_total);
        };
      }
    } catch {}

    // Guests are anonymous and RLS gives anon no table access, so postgres_changes
    // never fires here; the server pushes broadcasts on this venue-scoped table
    // channel instead (lib/realtime/channels.ts), and polling covers any gap.
    let changedTimer: ReturnType<typeof setTimeout> | null = null;
    // The topic is public (a venue's id is in every QR link), so every message on it is an empty ping: it says that
    // something changed at this table, and the phone reads its own order through its own session. A settlement, a
    // ticket moving on and the database's own change ping all mean the same thing: read the order now.
    const readSoon = () => {
      if (changedTimer) return;
      changedTimer = setTimeout(() => { changedTimer = null; latest.current.onTableChanged?.(); }, CHANGED_COALESCE_MS);
    };
    const topic = guestTableChannel(businessId, tableNumber);
    const sessionCh = topic && supabase.channel(topic)
      .on('broadcast', { event: 'table_settled' }, () => {
        readSoon();
        try { window.dispatchEvent(new CustomEvent('guest-wallet:refresh')); } catch {}
      })
      .on('broadcast', { event: 'order_status_updated' }, readSoon)
      .on('broadcast', { event: 'kot_status_update' }, readSoon)
      // The database pings this table whenever its bill, session or tickets change (migration 20261016000006).
      .on('broadcast', { event: 'changed' }, readSoon)
      .subscribe((status: string) => setConnected(status === 'SUBSCRIBED'));

    return () => {
      if (changedTimer) clearTimeout(changedTimer);
      if (bc) bc.close();
      if (sessionCh) void supabase.removeChannel(sessionCh);
      setConnected(false);
    };
  }, [businessId, tableNumber]);

  return connected;
}

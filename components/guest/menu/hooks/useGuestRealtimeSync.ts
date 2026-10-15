'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { guestTableChannel } from '@/lib/realtime/channels';
import { normalizeTableIdentifier } from './order-totals.util';

interface RealtimeSyncProps {
  businessId?: string; tableNumber: string; masterOrderId?: string;
  markBillSettled: (settledAmount?: number) => void; resetSettledState?: () => void;
  setKotStatus: (status: string) => void; setTicketNumber: (ticket: string) => void;
}

export function useGuestRealtimeSync(props: RealtimeSyncProps) {
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
    const topic = guestTableChannel(businessId, tableNumber);
    const sessionCh = topic && supabase.channel(topic)
      .on('broadcast', { event: 'table_settled' }, (msg: any) => {
        if (msg.payload && normalizeTableIdentifier(msg.payload.table_number) === normCurrent) {
          markBillSettled(msg.payload.settled_total, msg.payload.order_id);
          try { window.dispatchEvent(new CustomEvent('guest-wallet:refresh')); } catch {}
        }
      })
      .on('broadcast', { event: 'order_status_updated' }, (msg: any) => {
        if (msg.payload) handleOrderStatus(msg.payload.table_number || msg.payload.table_or_room, msg.payload.order_id, msg.payload.status, msg.payload.settled_total);
      })
      .on('broadcast', { event: 'kot_status_update' }, (msg: any) => {
        if (msg.payload) handleKot(msg.payload.table_number || msg.payload.table_or_room, msg.payload.order_id, msg.payload.status, msg.payload.ticket_number);
      }).subscribe();

    return () => { if (bc) bc.close(); if (sessionCh) void supabase.removeChannel(sessionCh); };
  }, [businessId, tableNumber]);
}

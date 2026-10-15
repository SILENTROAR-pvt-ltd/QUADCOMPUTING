'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { KitchenTicket, KitchenItem } from '@/lib/utils/kitchen';
import { normalizeKitchenTicket, normalizeKitchenTickets } from '@/lib/utils/kitchen-normalize';

export interface OrderItemRecord {
  id: string;
  order_id: string;
  item_id?: string;
  item_name: string;
  price: number;
  quantity: number;
  notes?: string;
  kot_status: 'pending' | 'cooking' | 'preparing' | 'ready' | 'served' | 'cancelled';
  business_id?: string;
  created_at?: string;
}

export interface UseKitchenRealtimeOptions {
  businessId?: string | null;
  onNewTicket?: (ticket: KitchenTicket) => void;
  onTicketUpdated?: (ticket: KitchenTicket) => void;
  onError?: (error: Error) => void;
}

export function useKitchenRealtime({
  businessId,
  onNewTicket,
  onTicketUpdated,
  onError,
}: UseKitchenRealtimeOptions = {}) {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep ref of latest tickets state for instantaneous snapshot rollbacks
  const ticketsRef = useRef<KitchenTicket[]>([]);
  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  // Keep callback refs stable across renders
  const onNewTicketRef = useRef(onNewTicket);
  const onTicketUpdatedRef = useRef(onTicketUpdated);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onNewTicketRef.current = onNewTicket;
    onTicketUpdatedRef.current = onTicketUpdated;
    onErrorRef.current = onError;
  }, [onNewTicket, onTicketUpdated, onError]);

  // 1. Initial Data Fetching (no polling)
  const fetchTickets = useCallback(async () => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const url = `/api/host/kitchen/tickets?business_id=${encodeURIComponent(businessId)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch kitchen tickets: HTTP ${res.status}`);
      }
      const data = await res.json();
      // One malformed ticket (no dishes list, a broken row) must not blank the whole board.
      setTickets(normalizeKitchenTickets(data.tickets));
    } catch (err: any) {
      console.error('[useKitchenRealtime fetch error]:', err);
      setError(err.message || 'Error fetching kitchen tickets');
      onErrorRef.current?.(err);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  // 2. Realtime Subscription to kitchen_tickets & order_items filtered by business_id
  useEffect(() => {
    fetchTickets();

    if (!businessId) return;

    const supabase = createClient();
    const channelName = `kitchen-realtime-${businessId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kitchen_tickets',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const { eventType, new: newRec, old: oldRec } = payload;

          if (eventType === 'INSERT') {
            const raw = newRec as any;
            const incoming: KitchenTicket = {
              id: raw.id,
              ticket_number: raw.ticket_number || 'KOT-000',
              table_or_room: raw.table_or_room || 'Counter / Takeaway',
              room_id: raw.room_id,
              order_id: raw.order_id,
              station: raw.station || 'Kitchen',
              items: Array.isArray(raw.items) ? raw.items : [],
              notes: raw.notes || null,
              status: raw.status || 'PENDING',
              created_at: raw.created_at || new Date().toISOString(),
              updated_at: raw.updated_at,
              status_history: Array.isArray(raw.status_history) ? raw.status_history : [],
            };

            setTickets((prev) => {
              if (prev.some((t) => t.id === incoming.id)) {
                return prev.map((t) => (t.id === incoming.id ? incoming : t));
              }
              return [incoming, ...prev];
            });

            onNewTicketRef.current?.(incoming);
          } else if (eventType === 'UPDATE') {
            const raw = newRec as any;
            const updated: KitchenTicket = {
              id: raw.id,
              ticket_number: raw.ticket_number || 'KOT-000',
              table_or_room: raw.table_or_room || 'Counter / Takeaway',
              room_id: raw.room_id,
              order_id: raw.order_id,
              station: raw.station || 'Kitchen',
              items: Array.isArray(raw.items) ? raw.items : [],
              notes: raw.notes || null,
              status: raw.status,
              created_at: raw.created_at || new Date().toISOString(),
              updated_at: raw.updated_at,
              status_history: Array.isArray(raw.status_history) ? raw.status_history : [],
            };

            setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            onTicketUpdatedRef.current?.(updated);
          } else if (eventType === 'DELETE') {
            const deletedId = (oldRec as any)?.id;
            if (deletedId) {
              setTickets((prev) => prev.filter((t) => t.id !== deletedId));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const { eventType, new: newRec, old: oldRec } = payload;

          if (eventType === 'INSERT') {
            setOrderItems((prev) => [...prev, newRec as OrderItemRecord]);
          } else if (eventType === 'UPDATE') {
            setOrderItems((prev) =>
              prev.map((item) => (item.id === (newRec as any).id ? (newRec as OrderItemRecord) : item))
            );
          } else if (eventType === 'DELETE') {
            const deletedId = (oldRec as any)?.id;
            if (deletedId) {
              setOrderItems((prev) => prev.filter((item) => item.id !== deletedId));
            }
          }
        }
      )
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED');
        if (status === 'CHANNEL_ERROR') {
          setError('Realtime subscription encountered an error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, fetchTickets]);

  // 3. Optimistic Status Update with Automatic Rollback on Error
  const updateTicketStatus = useCallback(
    async (ticketId: string, newStatus: KitchenTicket['status']): Promise<boolean> => {
      const rollbackSnapshot = ticketsRef.current;
      const targetTicket = rollbackSnapshot.find((t) => t.id === ticketId);

      if (!targetTicket) {
        console.warn(`[useKitchenRealtime] Ticket ${ticketId} not found in state.`);
        return false;
      }

      // Optimistic state transition. The stage time shows at once; the server's own
      // history replaces it when the response (or the realtime update) arrives.
      const nowIso = new Date().toISOString();
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                status: newStatus,
                updated_at: nowIso,
                status_history: [...(t.status_history ?? []), { from: t.status, to: newStatus, at: nowIso }],
              }
            : t
        )
      );

      try {
        const res = await fetch('/api/host/kitchen/tickets', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: ticketId,
            status: newStatus,
            business_id: businessId,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to update ticket status');
        }

        // Reconcile with server response if returned
        if (data.ticket) {
          setTickets((prev) =>
            prev.map((t) => (t.id === ticketId ? normalizeKitchenTicket({ ...t, ...data.ticket }) : t))
          );
        }
        return true;
      } catch (err: any) {
        // Automatic rollback on failure
        console.error('[KOT Rollback]: Update failed, restoring previous state:', err);
        setTickets(rollbackSnapshot);
        setError(err.message || 'Status update failed. Reverted to previous state.');
        onErrorRef.current?.(err);
        return false;
      }
    },
    [businessId]
  );

  // 4. Toggle Item Completion with Optimistic Update and Rollback
  const toggleItemDone = useCallback(
    async (ticketId: string, itemIdx: number): Promise<boolean> => {
      const rollbackSnapshot = ticketsRef.current;
      const targetTicket = rollbackSnapshot.find((t) => t.id === ticketId);

      if (!targetTicket || !targetTicket.items[itemIdx]) {
        return false;
      }

      const updatedItems: KitchenItem[] = targetTicket.items.map((it, idx) =>
        idx === itemIdx ? { ...it, completed: !it.completed } : it
      );

      // Optimistic update
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, items: updatedItems } : t))
      );

      try {
        const res = await fetch('/api/host/kitchen/tickets', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: ticketId,
            status: targetTicket.status,
            items: updatedItems,
            business_id: businessId,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to toggle item completion');
        }
        return true;
      } catch (err: any) {
        console.error('[KOT Item Rollback]: Item toggle failed, restoring state:', err);
        setTickets(rollbackSnapshot);
        setError(err.message || 'Item update failed. Reverted.');
        onErrorRef.current?.(err);
        return false;
      }
    },
    [businessId]
  );

  return {
    tickets,
    orderItems,
    isLoading,
    isSubscribed,
    error,
    refetch: fetchTickets,
    updateTicketStatus,
    toggleItemDone,
  };
}

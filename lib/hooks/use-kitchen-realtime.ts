'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { KitchenTicket, KitchenItem } from '@/lib/utils/kitchen';
import { normalizeKitchenTicket, normalizeKitchenTickets } from '@/lib/utils/kitchen-normalize';
import { mergeTicket, mergeTickets } from '@/lib/utils/kitchen-merge';
import { useFloorPing, PUSH_HEARTBEAT_MS } from './use-floor-ping';

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

/** How often an owner's screen reads the tickets while both its row-change channel and the floor push are down. */
const OWNER_FALLBACK_MS = 5000;

export interface UseKitchenRealtimeOptions {
  businessId?: string | null;
  onNewTicket?: (ticket: KitchenTicket) => void;
  onTicketUpdated?: (ticket: KitchenTicket) => void;
  onError?: (error: Error) => void;
  /**
   * Also read the tickets this often (while the tab is visible), ringing for any new one. For a staff phone signed in by
   * PIN, which has no realtime channel (its database rules only let a signed-in owner listen).
   */
  pollMs?: number;
}

export function useKitchenRealtime({
  businessId,
  onNewTicket,
  onTicketUpdated,
  onError,
  pollMs,
}: UseKitchenRealtimeOptions = {}) {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  /** The row-change channel failed (owner screens): the floor push and a short timed read take over until it is back. */
  const [channelDown, setChannelDown] = useState(false);
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

  // Reads of the whole list can come back out of order; an answer to a read sent before one already shown is dropped.
  const readSeq = useRef(0);
  const shownSeq = useRef(0);

  // 1. Initial Data Fetching (no polling)
  const fetchTickets = useCallback(async () => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }

    const seq = ++readSeq.current;
    try {
      setError(null);
      const url = `/api/host/kitchen/tickets?business_id=${encodeURIComponent(businessId)}`;
      const res = await fetch(url, { cache: 'no-store' });
      // Not signed in, or signed in without this venue (a host still in onboarding, an expired session): that is a
      // state to show, not a fault to report, so it does not reach the console or the error overlay.
      if (res.status === 401 || res.status === 403) {
        setTickets([]);
        setError('Sign in to this venue to see its kitchen.');
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to fetch kitchen tickets: HTTP ${res.status}`);
      }
      const data = await res.json();
      if (seq < shownSeq.current) return;
      shownSeq.current = seq;
      // One malformed ticket (no dishes list, a broken row) must not blank the whole board. A ticket already shown at a later
      // stage (the chef's own tap, a push) keeps that stage.
      const next = mergeTickets(ticketsRef.current, normalizeKitchenTickets(data.tickets));
      ticketsRef.current = next;
      setTickets(next);
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
                return prev.map((t) => (t.id === incoming.id ? mergeTicket(t, incoming) : t));
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

            // Row changes arrive in commit order, but one can still land just after the screen's own later tap.
            setTickets((prev) => prev.map((t) => (t.id === updated.id ? mergeTicket(t, updated) : t)));
            onTicketUpdatedRef.current?.(updated);
          } else if (eventType === 'DELETE') {
            const deletedId = (oldRec as any)?.id;
            if (deletedId) {
              setTickets((prev) => prev.filter((t) => t.id !== deletedId));
            }
          }
        }
      )
      // (The order lines were subscribed here too and kept in state that no screen read: every dish of every order sent a
      // realtime message and redrew the whole board for nothing. The tickets carry the dishes the kitchen shows.)
      .subscribe((status) => {
        // A dropped row-change channel is not an error for the cook: the board switches to the venue's floor push and a
        // short timed read (below) until supabase-js reconnects, and shows "reconnecting" in its header meanwhile. It used
        // to show a red error and stop updating.
        if (status === 'SUBSCRIBED') { setIsSubscribed(true); setChannelDown(false); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { setIsSubscribed(false); setChannelDown(true); }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, fetchTickets]);

  // 2b. Polling, for a phone with no realtime channel: a quiet re-read that reports the tickets it has not seen and the
  // ones whose status moved (the chef's "ready" reaching the waiter), the same way the row changes above do.
  const loadedOnce = useRef(false);
  useEffect(() => { if (!isLoading) loadedOnce.current = true; }, [isLoading]);
  const readAndRing = useCallback(async () => {
    if (!businessId) return;
    const seq = ++readSeq.current;
    try {
      const res = await fetch(`/api/host/kitchen/tickets?business_id=${encodeURIComponent(businessId)}`, { cache: 'no-store' });
      if (!res.ok) return;
      const fresh = normalizeKitchenTickets((await res.json()).tickets);
      if (seq < shownSeq.current) return;
      shownSeq.current = seq;
      const known = new Map(ticketsRef.current.map((t) => [t.id, t.status]));
      // A ticket already moved on here (the chef's tap, the push naming its stage) is never moved back by this read.
      const next = mergeTickets(ticketsRef.current, fresh);
      ticketsRef.current = next;
      setTickets(next);
      if (loadedOnce.current) {
        for (const t of next) {
          if (!known.has(t.id)) onNewTicketRef.current?.(t);
          else if (known.get(t.id) !== t.status) onTicketUpdatedRef.current?.(t);
        }
      }
    } catch {
      // The next read tries again.
    }
  }, [businessId]);

  // A ping that names a ticket's new stage moves that card at once (the chef's "ready" on the waiter's phone); the read
  // that follows confirms it. A ticket this screen has not seen yet waits for that read, which brings its dishes.
  const applyStage = useCallback(({ id, status }: { id: string; status: string }) => {
    const current = ticketsRef.current.find((t) => t.id === id);
    if (!current || current.status === status) return;
    // A late push for an earlier stage (the "preparing" ping landing after the chef's "ready" tap) changes nothing.
    if (mergeTicket(current, { ...current, status: status as KitchenTicket['status'] }).status === current.status) return;
    const at = new Date().toISOString();
    const moved = { ...current, status: status as KitchenTicket['status'], updated_at: at, status_history: [...(current.status_history ?? []), { from: current.status, to: status as KitchenTicket['status'], at }] };
    ticketsRef.current = ticketsRef.current.map((t) => (t.id === id ? moved : t));
    setTickets((prev) => prev.map((t) => (t.id === id ? moved : t)));
    onTicketUpdatedRef.current?.(moved);
  }, []);

  // The venue's floor ping reads at once; while it is up the timer below is only a slow safety net. A staff phone always
  // uses it; an owner's screen uses it whenever its own row-change channel is down.
  const pushUp = useFloorPing(pollMs || channelDown ? businessId : null, readAndRing, applyStage);
  const fallbackMs = pollMs ?? (channelDown ? OWNER_FALLBACK_MS : undefined);
  const readEveryMs = fallbackMs && pushUp ? PUSH_HEARTBEAT_MS : fallbackMs;

  useEffect(() => {
    if (!readEveryMs || !businessId) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void readAndRing(); }, readEveryMs);
    return () => clearInterval(timer);
  }, [readEveryMs, businessId, readAndRing]);

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
    isLoading,
    // Live when either live path works: the row-change channel (owner) or the venue's floor push (staff, or a fallback).
    isSubscribed: isSubscribed || pushUp,
    error,
    refetch: fetchTickets,
    updateTicketStatus,
    toggleItemDone,
  };
}

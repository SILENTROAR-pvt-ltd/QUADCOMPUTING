'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { businessFilter } from '@/lib/realtime/channels';
import { sharedGet } from '@/lib/utils/shared-get';

const POLL_MS = 8000;
/** Ticket changes inside this window share one read of the list. */
const COALESCE_MS = 150;

/** The ids in `next` that were not in `before`: the tickets that have just arrived. */
export const arrivedTickets = (before: Set<string>, next: string[]) => next.filter((id) => !before.has(id));

/**
 * A ticket whose dishes were all keyed in by staff (the waiter adding to a live bill). It rings on the kitchen board for
 * the chef, but not on host screens, so the waiter's own phone does not ring for what they just entered.
 */
export const isStaffAddedTicket = (ticket: { items?: Array<{ added_by?: string } | null> | null }) => {
  const items = Array.isArray(ticket?.items) ? ticket.items : [];
  return items.length > 0 && items.every((item) => item?.added_by === 'staff');
};

/**
 * New kitchen tickets, for the sidebar dot and the order bell. Realtime is the main signal; the poll catches a dropped
 * socket and keeps running in a background tab (the browser slows it there), so an order is still announced.
 * `arrivals` counts tickets that appeared after the first load, so opening the app never rings for old orders.
 */
export function usePendingKot(cafeId?: string) {
  const [pendingKotCount, setPendingKotCount] = useState(0);
  const [arrivals, setArrivals] = useState(0);
  const known = useRef<Set<string> | null>(null);

  const fetchPending = useCallback(async () => {
    const url = cafeId ? `/api/host/kitchen/tickets?business_id=${encodeURIComponent(cafeId)}` : '/api/host/kitchen/tickets';
    const res = await sharedGet<{ tickets?: any[] }>(url);
    if (!res.ok) return;
    const pending = (res.data?.tickets || []).filter((t: any) => t.status === 'PENDING');
    const ids = pending.map((t: any) => String(t.id));
    const staffAdded = new Set(pending.filter(isStaffAddedTicket).map((t: any) => String(t.id)));
    setPendingKotCount(ids.length);
    if (known.current) {
      // Tickets staff entered still count as pending, but never ring the host bell.
      const fresh = arrivedTickets(known.current, ids).filter((id) => !staffAdded.has(id));
      if (fresh.length) setArrivals((n) => n + fresh.length);
    }
    known.current = new Set(ids);
  }, [cafeId]);

  useEffect(() => {
    void fetchPending();
    // A rush inserts many tickets in a second, and each row change used to start a full read of the ticket list (and redraw
    // the whole console). Changes inside a short window now share one read.
    let pending: ReturnType<typeof setTimeout> | null = null;
    const readSoon = () => {
      if (pending) return;
      pending = setTimeout(() => { pending = null; void fetchPending(); }, COALESCE_MS);
    };
    const sb = createClient();
    const ch = sb
      .channel(`global_kot_dot_${cafeId || 'default'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kitchen_tickets', filter: businessFilter(cafeId) }, readSoon)
      .subscribe();
    const timer = window.setInterval(() => { void fetchPending(); }, POLL_MS);
    const onVisible = () => { if (!document.hidden) void fetchPending(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (pending) clearTimeout(pending);
      sb.removeChannel(ch); window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible);
    };
  }, [cafeId, fetchPending]);

  return { pendingKotCount, kotArrivals: arrivals };
}

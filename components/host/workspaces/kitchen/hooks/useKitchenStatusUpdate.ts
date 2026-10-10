import { useCallback } from 'react';
import type { KitchenTicket } from '@/lib/utils/kitchen';

export function useKitchenStatusUpdate(
  setTickets: React.Dispatch<React.SetStateAction<KitchenTicket[]>>,
  fetchTickets: () => Promise<void>,
  cafeId?: string
) {
  const updateStatus = useCallback(async (id: string, newStatus: KitchenTicket['status']) => {
    const nowIso = new Date().toISOString();
    setTickets((prev) => {
      const target = prev.find((t) => t.id === id);
      if (!target) return prev;
      const previousTickets = [...prev];
      const updatedItems = (target.items || []).map((item) => {
        const u = { ...item };
        if (newStatus === 'PREPARING' && !u.started_at) u.started_at = nowIso;
        else if (newStatus === 'READY' && !u.ready_at) { u.ready_at = nowIso; u.completed = true; }
        else if (newStatus === 'SERVED' && !u.delivered_at) { u.delivered_at = nowIso; u.completed = true; }
        return u;
      });

      const payload = {
        id, ticket_number: target.ticket_number,
        table_or_room: target.table_or_room, table_number: target.table_or_room,
        order_id: target.order_id, status: newStatus,
      };

      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          new BroadcastChannel('quad_kitchen_sync').postMessage({ event: 'kot_status_update', payload });
        }
      } catch {}

      fetch('/api/host/kitchen/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, items: updatedItems, business_id: cafeId }),
      }).then(async (res) => {
        // The guest table is notified server-side by the PATCH route.
        if (!res.ok) throw new Error('Failed to update ticket');
      }).catch(() => {
        setTickets(previousTickets);
        try {
          window.dispatchEvent(new CustomEvent('toast:show', { detail: { message: 'Sync failed: Restored ticket status' } }));
        } catch {}
        fetchTickets();
      });

      return prev.map((t) => (t.id === id ? { ...t, status: newStatus, items: updatedItems, updated_at: nowIso } : t));
    });
  }, [cafeId, fetchTickets, setTickets]);

  return { updateStatus };
}

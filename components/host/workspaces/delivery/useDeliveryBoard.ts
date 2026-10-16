'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DeliveryStatus } from '@/lib/services/delivery/delivery-rules';

export interface DeliveryOrder {
  id: string;
  table_number: string;
  created_at: string;
  customer_name: string | null;
  grand_total: number;
  items: Array<{ name?: string; item_name?: string; quantity?: number; qty?: number }> | null;
  delivery_address: string | null;
  delivery_phone: string | null;
  delivery_distance_km: number | null;
  delivery_fee: number;
  delivery_payment: 'cod' | 'upi_advance' | null;
  delivery_paid: boolean;
  delivery_status: DeliveryStatus | null;
}

const REFRESH_MS = 15_000;

/** The venue's delivery orders, refreshed every few seconds and when the host comes back to the tab. */
export function useDeliveryBoard() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/host/delivery', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Delivery orders could not be loaded.');
      setOrders(json.orders ?? []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [load]);

  const patch = async (orderId: string, body: { status?: DeliveryStatus; paid?: boolean }) => {
    setBusyId(orderId); setError(null);
    try {
      const res = await fetch('/api/host/delivery', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, ...body }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'That could not be updated.');
      setOrders((list) => list.map((o) => (o.id === orderId ? { ...o, ...json.order } : o)));
    } catch (e: any) {
      setError(e.message);
      void load();
    } finally {
      setBusyId(null);
    }
  };

  return { orders, loading, error, busyId, advance: (id: string, status: DeliveryStatus) => patch(id, { status }), markPaid: (id: string) => patch(id, { paid: true }) };
}

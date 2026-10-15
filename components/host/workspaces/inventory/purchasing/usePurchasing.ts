'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildPurchaseMessage, poReference, whatsappUrl, type PurchaseLine } from '@/lib/services/inventory/purchase-message';
import type { Vendor, PurchaseOrder } from './purchasing.types';

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
  const json = res ? await res.json().catch(() => ({})) : {};
  if (!res?.ok) throw new Error(json.error || 'No connection. Please try again.');
  return json;
}

/** Vendors, purchase orders, and the actions that send, receive and cancel them. */
export function usePurchasing(version: number) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [venueName, setVenueName] = useState('our venue');
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const j = await call('/api/host/inventory/purchase-orders', 'GET');
      setVendors(j.vendors || []); setOrders(j.orders || []); setVenueName(j.venue_name || 'our venue'); setError(null);
    } catch (e: any) { setError(e.message); } finally { setLoaded(true); }
  }, []);
  useEffect(() => { void load(); }, [load, version]);

  /** Quantity of each item already on an open order, so it is not ordered twice. */
  const onOrder = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) if (o.status === 'sent') for (const l of o.lines) m.set(l.item_id, (m.get(l.item_id) || 0) + l.quantity);
    return m;
  }, [orders]);

  const saveVendor = async (name: string, phone: string) => {
    const j = await call('/api/host/inventory/vendors', 'POST', { name, phone });
    await load();
    return j.vendor as Vendor;
  };

  /**
   * Opens WhatsApp first (inside the tap, so the browser allows it), then saves the order.
   * Without a number WhatsApp opens on the contact picker with the message ready.
   */
  const sendOrder = (vendor: Vendor, lines: PurchaseLine[], note: string) => {
    const reference = poReference();
    const text = buildPurchaseMessage({ venueName, vendorName: vendor.name, reference, lines, note });
    window.open(whatsappUrl(vendor.phone, text), '_blank', 'noopener,noreferrer');
    return call('/api/host/inventory/purchase-orders', 'POST', {
      reference, vendor_id: vendor.id, vendor_name: vendor.name, vendor_phone: vendor.phone, lines, note,
    }).then(load);
  };

  /** The goods are already here: saved as an order and booked into stock in one request (no vendor means a market purchase). */
  const recordNow = async (vendor: Vendor | null, lines: PurchaseLine[], note: string) => {
    const j = await call('/api/host/inventory/purchase-orders', 'POST', {
      reference: poReference(), vendor_id: vendor?.id ?? null, vendor_name: vendor?.name ?? '', vendor_phone: vendor?.phone ?? null,
      lines, note, receive_now: true,
    });
    void load();
    return j as { received: number; failed: string[] };
  };

  const resend = (o: PurchaseOrder) => {
    const text = buildPurchaseMessage({ venueName, vendorName: o.vendor_name, reference: o.reference, lines: o.lines, note: o.note });
    window.open(whatsappUrl(o.vendor_phone, `Reminder: ${text}`), '_blank', 'noopener,noreferrer');
  };

  const receive = async (id: string, lines: PurchaseLine[]) => {
    const j = await call('/api/host/inventory/purchase-orders', 'PATCH', { id, action: 'receive', lines });
    await load();
    return j as { received: number; failed: string[] };
  };

  const cancel = async (id: string) => { await call('/api/host/inventory/purchase-orders', 'PATCH', { id, action: 'cancel' }); await load(); };

  return { vendors, orders, venueName, error, loaded, onOrder, saveVendor, sendOrder, recordNow, resend, receive, cancel };
}

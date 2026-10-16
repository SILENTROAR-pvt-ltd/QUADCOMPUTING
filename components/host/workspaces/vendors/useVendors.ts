'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ShareableOrder, VendorCategory } from '@/lib/services/vendors/vendor-input';

export interface Vendor {
  id: string;
  name: string;
  category: VendorCategory;
  whatsapp_phone: string;
  qr_image: string | null;
  notes: string | null;
  created_at: string;
}

export type VendorDraft = Pick<Vendor, 'name' | 'category' | 'whatsapp_phone' | 'qr_image' | 'notes'>;

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'That did not go through. Please try again.');
  return json;
}

/** The venue's vendors, with add, edit and remove, and the recent guest orders to share with them. */
export function useVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const json = await send('/api/host/vendors', 'GET');
      setVendors(json.vendors ?? []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async (draft: VendorDraft, id?: string) => {
    const json = id ? await send(`/api/host/vendors/${id}`, 'PATCH', draft) : await send('/api/host/vendors', 'POST', draft);
    setVendors((list) => (id ? list.map((v) => (v.id === id ? json.vendor : v)) : [json.vendor, ...list]));
  };

  const remove = async (id: string) => {
    await send(`/api/host/vendors/${id}`, 'DELETE');
    setVendors((list) => list.filter((v) => v.id !== id));
  };

  const loadOrders = useCallback(async (): Promise<{ orders: ShareableOrder[]; venueName: string }> => {
    const json = await send('/api/host/vendors/orders', 'GET');
    return { orders: json.orders ?? [], venueName: json.venueName || 'our venue' };
  }, []);

  return { vendors, loading, error, retry: load, save, remove, loadOrders };
}

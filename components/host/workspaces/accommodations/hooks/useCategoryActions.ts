'use client';

import { useState } from 'react';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import type { RoomAddon } from '@/types';

export interface NewCategoryPayload {
  name: string;
  price: number;
  occupancy: number;
  photos: string[];
  amenities: string[];
  addons: RoomAddon[];
  room_numbers: string[];
}

/** Creating and deleting room categories (each creates or removes its rooms and catalogue item). */
export function useCategoryActions(reload: () => Promise<void> | void, notify: (msg: string) => void, onCreated: () => void) {
  const propertyBranches = useHostWorkspace((s) => s.propertyBranches);
  const upsertCatalogItem = useHostWorkspace((s) => s.upsertCatalogItem);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createCategory = async (payload: NewCategoryPayload) => {
    setIsSubmitting(true);
    try {
      const units = payload.room_numbers.length || 1;
      const res = await fetch('/api/host/accommodations/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, total_units: units }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) { alert(result.error || 'The room category could not be created.'); return; }
      const item = result.catalogItem;
      if (item) {
        const at = item.created_at || new Date().toISOString();
        upsertCatalogItem({
          id: item.id, branchId: propertyBranches[0]?.id || 'default', kind: 'accommodation', name: item.name,
          description: item.description || '', imageUrl: item.image_url || null, status: 'active', roomType: 'suite',
          nightlyRate: { amountMinor: Number(item.price), currency: 'INR' }, occupancy: { adults: payload.occupancy, children: 0 },
          inventoryCount: units, amenities: payload.amenities, addons: [], createdAt: at, updatedAt: at,
        } as any);
      }
      notify(`${result.category?.name || payload.name} created with ${result.rooms?.length || units} room${(result.rooms?.length || units) === 1 ? '' : 's'}.`);
      window.dispatchEvent(new CustomEvent('wallet:refresh'));
      await reload();
      onCreated();
    } catch {
      alert('No connection. The room category was not created.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCategory = async (catId: string, name: string) => {
    if (!confirm(`Delete "${name}"? Its rooms and its catalogue item are removed too.`)) return;
    try {
      const res = await fetch(`/api/host/accommodations/categories?id=${encodeURIComponent(catId)}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { alert(body.error || 'The category could not be deleted.'); return; }
      notify(`${name} deleted.`);
      await reload();
    } catch {
      alert('No connection. Nothing was deleted.');
    }
  };

  return { isSubmitting, createCategory, deleteCategory };
}

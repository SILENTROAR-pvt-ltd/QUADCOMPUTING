import { useState } from 'react';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import type { RoomCategoryFormData } from '@/components/host/workspaces/accommodations/configurator/RoomCategoryForm';

export function useAccommodationSubmit(onSuccess: () => void, onClose: () => void) {
  const primaryBranch = useHostWorkspace((state) => state.propertyBranches[0]);
  const upsertCatalogItem = useHostWorkspace((state) => state.upsertCatalogItem);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submitAccommodation = async (formData: RoomCategoryFormData) => {
    if (!primaryBranch) {
      setError('No valid location/business found. Please finish property onboarding.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const unitsCount = formData.room_numbers && formData.room_numbers.length > 0 ? formData.room_numbers.length : 1;
      const res = await fetch('/api/host/accommodations/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name, price: formData.price, occupancy: formData.occupancy,
          photos: formData.photos, amenities: formData.amenities, addons: formData.addons,
          room_numbers: formData.room_numbers || [], total_units: unitsCount,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to provision accommodation category.');
      }
      const result = await res.json();
      if (result.catalogItem) {
        upsertCatalogItem({
          id: result.catalogItem.id as any,
          branchId: (primaryBranch?.id || 'default') as any,
          kind: 'accommodation', name: result.catalogItem.name,
          description: result.catalogItem.description || '',
          imageUrl: result.catalogItem.image_url || null, status: 'active', roomType: 'suite',
          nightlyRate: { amountMinor: Number(result.catalogItem.price), currency: 'INR' },
          occupancy: { adults: formData.occupancy, children: 0 }, inventoryCount: unitsCount,
          amenities: formData.amenities, addons: [],
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        });
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wallet:refresh'));
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed creating accommodation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, setIsSubmitting, error, setError, submitAccommodation };
}

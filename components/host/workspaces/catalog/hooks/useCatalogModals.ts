import { useState } from 'react';
import type { CatalogItem } from '@/types';

export function useCatalogModals(onSuccess: () => void) {
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [initialItemType, setInitialItemType] = useState<'food' | 'room' | 'service'>('food');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isBulkPricingOpen, setIsBulkPricingOpen] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [editingAccommodation, setEditingAccommodation] = useState<any | null>(null);
  const [recipeItem, setRecipeItem] = useState<CatalogItem | null>(null);
  const [isPhotoVaultOpen, setIsPhotoVaultOpen] = useState(false);

  const openManualModal = (kind: 'food' | 'room' | 'service') => {
    setInitialItemType(kind);
    setIsManualModalOpen(true);
  };

  const handleEditItem = async (item: CatalogItem) => {
    if (item.kind === 'accommodation') {
      try {
        const res = await fetch('/api/host/accommodations/categories');
        if (res.ok) {
          const data = await res.json();
          const found = (data.categories || []).find(
            (c: any) =>
              c.catalog_item_id === item.id ||
              c.name?.trim().toLowerCase() === item.name?.trim().toLowerCase()
          );
          if (found) {
            setEditingAccommodation({
              id: found.id,
              name: found.name,
              price: Number(found.price) || item.nightlyRate.amountMinor,
              occupancy: Number(found.occupancy) || (item as any).occupancy?.adults || 2,
              photos:
                Array.isArray(found.photos) && found.photos.length > 0
                  ? found.photos
                  : item.imageUrl
                  ? [item.imageUrl]
                  : [],
              amenities: Array.isArray(found.amenities) ? found.amenities : (item as any).amenities || [],
              addons: found.addons || found.available_addons || [],
            });
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to fetch category details for accommodation item', e);
      }

      setEditingAccommodation({
        id: item.id,
        name: item.name,
        price: item.nightlyRate.amountMinor,
        occupancy: (item as any).occupancy?.adults || 2,
        photos: item.imageUrl ? [item.imageUrl] : [],
        amenities: (item as any).amenities || ['High-Speed Wi-Fi', 'Air Conditioning', 'King Size Bed'],
        addons: (item as any).addons || [],
      });
    } else {
      setSelectedItem(item);
    }
  };

  /** Matches dishes without a photo to the venue's own Photo Vault, on an exact name match only. */
  const handleAutoFillImages = async (onDone: () => void) => {
    try {
      setIsAutoFilling(true);
      const res = await fetch('/api/host/catalog/auto-fill-images', { method: 'POST', cache: 'no-store' } as RequestInit);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not match photos. Please try again.');
      if (data.count === 0 && (data.unmatched?.length ?? 0) === 0) {
        alert('Every dish already has a photo.');
      } else {
        const pending = data.unmatched?.length ?? 0;
        const more = data.has_more ? '\nRun it again to continue with the remaining dishes.' : '';
        alert(
          `Matched ${data.count} dish photo${data.count === 1 ? '' : 's'} from your Photo Vault.\n` +
          (pending > 0 ? `${pending} dish${pending === 1 ? '' : 'es'} need a photo: open a dish's photo box to choose one.` : 'No dishes are left without a photo.') +
          more,
        );
      }
      onDone();
    } catch (e: any) {
      alert(e.message || 'An error occurred while matching photos.');
    } finally {
      setIsAutoFilling(false);
    }
  };

  return {
    isManualModalOpen,
    setIsManualModalOpen,
    initialItemType,
    openManualModal,
    isAiModalOpen,
    setIsAiModalOpen,
    isBulkPricingOpen,
    setIsBulkPricingOpen,
    isAutoFilling,
    selectedItem,
    setSelectedItem,
    editingAccommodation,
    setEditingAccommodation,
    recipeItem,
    setRecipeItem,
    isPhotoVaultOpen,
    setIsPhotoVaultOpen,
    handleEditItem,
    handleAutoFillImages,
  };
}

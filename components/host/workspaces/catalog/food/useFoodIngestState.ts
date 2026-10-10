'use client';

import { useState, useEffect } from 'react';
import { useHostWorkspace } from '@/lib/store/host-workspace.store';
import type { CatalogItem } from '@/types';
import { isAccommodationEntity } from '@/lib/utils/catalog-item';
import type { DietType } from './FoodDietarySelector';

interface UseFoodIngestParams {
  item?: CatalogItem | null;
  onSuccess: () => void;
  onClose: () => void;
  setIsSubmitting: (submitting: boolean) => void;
  setError: (err: string) => void;
}

export function useFoodIngestState({
  item,
  onSuccess,
  onClose,
  setIsSubmitting,
  setError,
}: UseFoodIngestParams) {
  const propertyBranches = useHostWorkspace((state) => state.propertyBranches);
  const businessId = useHostWorkspace((state) => state.businessId);
  const primaryBranch = propertyBranches[0];
  const upsertCatalogItem = useHostWorkspace((state) => state.upsertCatalogItem);
  const isEdit = Boolean(item && item.id);

  const getInitialPrice = (it?: CatalogItem | null) =>
    it ? (isAccommodationEntity(it) ? (it as any).nightlyRate?.amountMinor : (it as any).price?.amountMinor)?.toString() || '' : '';

  const [foodName, setFoodName] = useState(item?.name || '');
  const [foodPrice, setFoodPrice] = useState(getInitialPrice(item));
  // A new dish starts with no category: the host picks the venue's own one (never a made-up default).
  const [foodCategory, setFoodCategory] = useState((item as any)?.category || '');
  const [foodDietType, setFoodDietType] = useState<DietType>((item as any)?.dietary || (item as any)?.metadata?.dietary || 'veg');
  const [foodPrepTime, setFoodPrepTime] = useState(((item as any)?.prepTimeMinutes ?? (item as any)?.metadata?.prep_time_minutes ?? 15).toString());
  const [foodInitialStock, setFoodInitialStock] = useState(((item as any)?.inventoryCount ?? (item as any)?.metadata?.inventory_count ?? 50).toString());
  const [foodDescription, setFoodDescription] = useState(item?.description || '');
  const [foodImageUrl, setFoodImageUrl] = useState(item?.imageUrl || '');

  useEffect(() => {
    if (item) {
      setFoodName(item.name || '');
      setFoodPrice(getInitialPrice(item));
      setFoodCategory((item as any).category || '');
      setFoodDietType((item as any).dietary || (item as any).metadata?.dietary || 'veg');
      setFoodPrepTime(((item as any)?.prepTimeMinutes ?? (item as any)?.metadata?.prep_time_minutes ?? 15).toString());
      setFoodInitialStock(((item as any)?.inventoryCount ?? (item as any)?.metadata?.inventory_count ?? 50).toString());
      setFoodDescription(item.description || '');
      setFoodImageUrl(item.imageUrl || '');
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const priceNum = parseFloat(foodPrice);
      const prepNum = parseInt(foodPrepTime, 10);
      const stockNum = parseInt(foodInitialStock, 10);

      const payload = {
        // branchId: the real location UUID if we have it; the backend will resolve it
        branchId: primaryBranch?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(primaryBranch.id)
          ? primaryBranch.id
          : undefined,
        // business_id is always sent — the route handler injects it from the auth session
        business_id: businessId || undefined,
        name: foodName.trim(),
        description: foodDescription.trim(),
        price: priceNum,
        imageUrl: foodImageUrl.trim() || null,
        itemType: 'food',
        category: foodCategory.trim() || 'General',
        dietType: foodDietType,
        prepTimeMinutes: isNaN(prepNum) ? 15 : prepNum,
        inventoryCount: isNaN(stockNum) ? 50 : stockNum,
        metadata: {
          dietary: foodDietType,
          prep_time_minutes: isNaN(prepNum) ? 15 : prepNum,
          inventory_count: isNaN(stockNum) ? 50 : stockNum,
        },
      };

      const endpoint = isEdit ? '/api/host/catalog/update' : '/api/host/catalog';
      const bodyPayload = isEdit ? { ...payload, id: item?.id } : payload;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save food item.');
      }

      upsertCatalogItem({
        ...(item || {}),
        id: (item?.id || `item_${Date.now()}`) as any,
        branchId: primaryBranch?.id || 'branch-1',
        name: foodName.trim(),
        kind: 'food_beverage',
        category: foodCategory.trim() || 'General',
        course: foodCategory.trim() || 'General',
        dietary: foodDietType,
        price: { amountMinor: Math.round(priceNum * 100), currency: 'INR' },
        description: foodDescription.trim(),
        imageUrl: foodImageUrl.trim() || undefined,
        prepTimeMinutes: isNaN(prepNum) ? 15 : prepNum,
        inventoryCount: isNaN(stockNum) ? 50 : stockNum,
        status: 'active',
        addons: [],
        createdAt: item?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    foodName, setFoodName, foodPrice, setFoodPrice,
    foodCategory, setFoodCategory, foodDietType, setFoodDietType,
    foodPrepTime, setFoodPrepTime, foodInitialStock, setFoodInitialStock,
    foodDescription, setFoodDescription, foodImageUrl, setFoodImageUrl,
    handleSubmit,
  };
}

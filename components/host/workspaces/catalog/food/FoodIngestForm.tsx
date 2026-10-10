'use client';

import React from 'react';
import type { CatalogItem } from '@/types';
import { FoodIngestImageUpload } from './FoodIngestImageUpload';
import { CategoryCombobox } from './CategoryCombobox';
import { FoodBasicFields } from './FoodBasicFields';
import { FoodDietarySelector } from './FoodDietarySelector';
import { FoodPrepStockFields } from './FoodPrepStockFields';
import { useFoodIngestState } from './useFoodIngestState';

interface Props {
  onSuccess: () => void;
  onClose: () => void;
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
  setError: (err: string) => void;
  item?: CatalogItem | null;
}

export function FoodIngestForm({
  onSuccess,
  onClose,
  isSubmitting,
  setIsSubmitting,
  setError,
  item,
}: Props) {
  const form = useFoodIngestState({ item, onSuccess, onClose, setIsSubmitting, setError });

  const inputClass =
    'w-full rounded-xl border border-neutral-200/90 bg-white hover:border-neutral-300 focus:border-neutral-900 px-4 py-2.5 sm:py-3 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-2xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-neutral-900/10';
  const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500';

  return (
    <form id="food-ingest-form" onSubmit={form.handleSubmit} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <FoodBasicFields
          foodName={form.foodName}
          setFoodName={form.setFoodName}
          foodPrice={form.foodPrice}
          setFoodPrice={form.setFoodPrice}
          inputClass={inputClass}
          labelClass={labelClass}
        />

        <CategoryCombobox
          value={form.foodCategory}
          onChange={form.setFoodCategory}
          inputClass={inputClass}
          labelClass={labelClass}
        />

        <FoodDietarySelector
          foodDietType={form.foodDietType}
          setFoodDietType={form.setFoodDietType}
          labelClass={labelClass}
        />

        <FoodPrepStockFields
          foodPrepTime={form.foodPrepTime}
          setFoodPrepTime={form.setFoodPrepTime}
          foodInitialStock={form.foodInitialStock}
          setFoodInitialStock={form.setFoodInitialStock}
          foodDescription={form.foodDescription}
          setFoodDescription={form.setFoodDescription}
          inputClass={inputClass}
          labelClass={labelClass}
        />

        <FoodIngestImageUpload
          foodImageUrl={form.foodImageUrl}
          setFoodImageUrl={form.setFoodImageUrl}
          inputClass={inputClass}
          labelClass={labelClass}
        />
      </div>
    </form>
  );
}

'use client';

import React from 'react';
import type { RoomAddon } from '@/types';
import { Building2 } from 'lucide-react';
import { RoomCategoryForm, RoomCategoryFormData } from './configurator/RoomCategoryForm';

interface Props {
  commonAmenities: string[];
  isSubmitting: boolean;
  onSubmit: (payload: {
    name: string;
    price: number;
    occupancy: number;
    photos: string[];
    amenities: string[];
    addons: RoomAddon[];
    room_numbers: string[];
  }) => Promise<void>;
}

export function CategoryConfigurator({ commonAmenities, isSubmitting, onSubmit }: Props) {
  const handleSubmit = async (formData: RoomCategoryFormData) => {
    await onSubmit({
      name: formData.name,
      price: formData.price,
      occupancy: formData.occupancy,
      photos: formData.photos,
      amenities: formData.amenities,
      addons: formData.addons,
      room_numbers: formData.room_numbers || []
    });
  };

  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-10 shadow-xs">
      <div className="border-b border-zinc-100 pb-6 mb-8 flex items-start justify-between">
        <div>
          <h2 className="font-serif text-2xl font-medium tracking-tight text-zinc-900">
            Provision New Room Category
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Define accommodation specifications, pricing, amenities, add-ons, and manual room numbers.
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600">
          <Building2 className="h-5 w-5" />
        </div>
      </div>

      <RoomCategoryForm
        commonAmenities={commonAmenities}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        isEditMode={false}
        showRoomNumbers={true}
      />
    </section>
  );
}

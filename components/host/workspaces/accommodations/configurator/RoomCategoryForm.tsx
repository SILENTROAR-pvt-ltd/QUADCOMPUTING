'use client';

import React, { useState, useEffect } from 'react';
import type { RoomAddon } from '@/types';
import { RoomAddonsManager } from '../RoomAddonsManager';
import { Users, ShieldCheck } from 'lucide-react';
import { RoomNumberIngestionBuilder } from './RoomNumberIngestionBuilder';
import { AmenitiesSelector } from './AmenitiesSelector';
import { PhotosUploader } from './PhotosUploader';
import {
  DEFAULT_COMMON_AMENITIES,
  RoomCategoryFormData,
} from './room-category.constants';
import { RoomCategoryFormActions } from './RoomCategoryFormActions';

export type { RoomCategoryFormData };
export { DEFAULT_COMMON_AMENITIES };

interface Props {
  initialData?: Partial<RoomCategoryFormData> | null;
  commonAmenities?: string[];
  isSubmitting?: boolean;
  isDeleting?: boolean;
  onSubmit: (data: RoomCategoryFormData) => Promise<void>;
  onCancel?: () => void;
  onDelete?: () => void;
  isEditMode?: boolean;
  showRoomNumbers?: boolean;
  submitButtonText?: string;
}

const inputClass =
  'w-full rounded-xl border border-neutral-200/90 bg-white hover:border-neutral-300 focus:border-neutral-900 px-4 py-2.5 sm:py-3 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-2xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-neutral-900/10';
const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500';

export function RoomCategoryForm({
  initialData,
  commonAmenities = DEFAULT_COMMON_AMENITIES,
  isSubmitting = false,
  isDeleting = false,
  onSubmit,
  onCancel,
  onDelete,
  isEditMode = false,
  showRoomNumbers = true,
  submitButtonText,
}: Props) {
  const [categoryName, setCategoryName] = useState(initialData?.name || '');
  const [pricePerNight, setPricePerNight] = useState(
    initialData?.price !== undefined ? String(initialData.price) : ''
  );
  const [maxOccupancy, setMaxOccupancy] = useState(
    initialData?.occupancy !== undefined ? String(initialData.occupancy) : '2'
  );
  const [photoUrl, setPhotoUrl] = useState(initialData?.photos?.[0] || '');
  const [photoList, setPhotoList] = useState<string[]>(
    Array.isArray(initialData?.photos) ? initialData.photos : []
  );
  const [allAmenitiesList, setAllAmenitiesList] = useState<string[]>(commonAmenities);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    Array.isArray(initialData?.amenities) && initialData.amenities.length > 0
      ? initialData.amenities
      : ['High-Speed Wi-Fi', 'Air Conditioning', 'King Size Bed']
  );
  const [selectedAddons, setSelectedAddons] = useState<RoomAddon[]>(
    Array.isArray(initialData?.addons) ? initialData.addons : []
  );
  const [manualRoomNumbers, setManualRoomNumbers] = useState<string[]>(
    Array.isArray(initialData?.room_numbers)
      ? initialData.room_numbers
      : isEditMode
        ? []
        : ['101', '102', '103', '104']
  );

  useEffect(() => {
    if (initialData) {
      if (initialData.name !== undefined) setCategoryName(initialData.name);
      if (initialData.price !== undefined) setPricePerNight(String(initialData.price));
      if (initialData.occupancy !== undefined) setMaxOccupancy(String(initialData.occupancy));
      if (Array.isArray(initialData.photos)) {
        setPhotoList(initialData.photos);
        setPhotoUrl(initialData.photos[0] || '');
      }
      if (Array.isArray(initialData.amenities)) {
        setSelectedAmenities(initialData.amenities);
      }
      if (Array.isArray(initialData.addons)) {
        setSelectedAddons(initialData.addons);
      }
      if (Array.isArray(initialData.room_numbers)) {
        setManualRoomNumbers(initialData.room_numbers);
      }
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim() || !pricePerNight) {
      alert('Please fill in room category name and nightly price.');
      return;
    }

    const photosToSubmit =
      photoList.length > 0
        ? photoList
        : photoUrl.trim()
          ? [photoUrl.trim()]
          : ['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'];

    await onSubmit({
      id: initialData?.id,
      name: categoryName.trim(),
      price: parseFloat(pricePerNight),
      occupancy: parseInt(maxOccupancy, 10) || 2,
      photos: photosToSubmit,
      amenities: selectedAmenities,
      addons: selectedAddons,
      room_numbers: manualRoomNumbers,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Details Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="catName" className={labelClass}>
            Category Name *
          </label>
          <input
            id="catName"
            type="text"
            required
            placeholder="e.g. Luxury Deluxe Rooms, Private Villa, Family Suite"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="nightlyRate" className={labelClass}>
            Nightly Tariff (₹) *
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-400 select-none">
              ₹
            </span>
            <input
              id="nightlyRate"
              type="number"
              min="0"
              required
              placeholder="3500"
              value={pricePerNight}
              onChange={(e) => setPricePerNight(e.target.value)}
              className={`${inputClass} pl-8 font-mono font-medium`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="maxOccupancy" className={labelClass}>
            Max Occupancy (Guests)
          </label>
          <div className="relative">
            <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
            <input
              id="maxOccupancy"
              type="number"
              min="1"
              max="30"
              required
              value={maxOccupancy}
              onChange={(e) => setMaxOccupancy(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>
          <p className="mt-1 text-[11px] text-neutral-400">Adult guest capacity</p>
        </div>
      </div>

      {showRoomNumbers && (
        <RoomNumberIngestionBuilder
          manualRoomNumbers={manualRoomNumbers}
          setManualRoomNumbers={setManualRoomNumbers}
        />
      )}

      <PhotosUploader
        photoUrl={photoUrl}
        setPhotoUrl={setPhotoUrl}
        photoList={photoList}
        setPhotoList={setPhotoList}
      />

      <AmenitiesSelector
        allAmenitiesList={allAmenitiesList}
        setAllAmenitiesList={setAllAmenitiesList}
        selectedAmenities={selectedAmenities}
        setSelectedAmenities={setSelectedAmenities}
      />

      <RoomAddonsManager
        initialData={selectedAddons}
        onChange={setSelectedAddons}
      />

      {/* Enterprise Sync Banner */}
      <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4.5 flex items-start gap-3.5 shadow-2xs">
        <ShieldCheck className="h-5 w-5 text-neutral-700 shrink-0 mt-0.5" />
        <div className="text-xs text-neutral-700 space-y-1">
          <p className="font-semibold text-neutral-900">End-to-End Enterprise Sync</p>
          <p className="text-neutral-500 leading-relaxed">
            {isEditMode ? (
              <>Saving changes will automatically synchronize the room category, its paid add-ons, amenities, and its connected POS catalog item.</>
            ) : (
              <>Submitting this form saves the room category, tariff, add-ons, amenities, and {manualRoomNumbers.length} physical rooms for the live front desk.</>
            )}
          </p>
        </div>
      </div>

      <RoomCategoryFormActions
        isEditMode={isEditMode}
        isSubmitting={isSubmitting}
        isDeleting={isDeleting}
        onDelete={onDelete}
        onCancel={onCancel}
        submitButtonText={submitButtonText}
      />
    </form>
  );
}

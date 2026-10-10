'use client';

import React from 'react';
import { Users } from 'lucide-react';
import type { RoomAddon } from '@/types';
import { RoomAddonsManager } from '../RoomAddonsManager';

interface Props {
  name: string;
  setName: (val: string) => void;
  price: string;
  setPrice: (val: string) => void;
  occupancy: string;
  setOccupancy: (val: string) => void;
  photoUrl: string;
  setPhotoUrl: (val: string) => void;
  photoList: string[];
  onAddPhoto: () => void;
  onRemovePhoto: (idx: number) => void;
  selectedAmenities: string[];
  toggleAmenity: (amenity: string) => void;
  customAmenityText: string;
  setCustomAmenityText: (val: string) => void;
  onAddCustomAmenity: () => void;
  addons: RoomAddon[];
  setAddons: (addons: RoomAddon[]) => void;
  commonAmenities: string[];
}

const inputClass = "w-full bg-neutral-50/80 border border-neutral-200 focus:border-neutral-900 text-neutral-900 rounded-xl px-4 py-3 text-sm outline-none transition-all focus:bg-white";
const labelClass = "mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-500";

export function EditCategoryDetailsTab({
  name,
  setName,
  price,
  setPrice,
  occupancy,
  setOccupancy,
  photoUrl,
  setPhotoUrl,
  photoList,
  onAddPhoto,
  onRemovePhoto,
  selectedAmenities,
  toggleAmenity,
  customAmenityText,
  setCustomAmenityText,
  onAddCustomAmenity,
  addons,
  setAddons,
  commonAmenities
}: Props) {
  return (
    <div className="space-y-6">
      {/* Name, Price, Occupancy */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className={labelClass}>Category Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="e.g. Luxury Deluxe Rooms"
          />
        </div>

        <div>
          <label className={labelClass}>Nightly Price (₹) *</label>
          <input
            type="number"
            required
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={`${inputClass} font-mono font-bold`}
            placeholder="3500"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Max Occupancy (Adults)</label>
        <div className="relative max-w-xs">
          <Users className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
          <input
            type="number"
            min="1"
            max="30"
            value={occupancy}
            onChange={(e) => setOccupancy(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>
      </div>

      {/* Photos */}
      <div className="space-y-3">
        <label className={labelClass}>Category Photos (URLs)</label>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://images.unsplash.com/..."
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            className={inputClass}
          />
          <button
            type="button"
            onClick={onAddPhoto}
            className="rounded-xl bg-zinc-100 hover:bg-zinc-200 px-5 py-2 text-xs font-bold text-zinc-800 transition-colors cursor-pointer"
          >
            Add Photo
          </button>
        </div>

        {photoList.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {photoList.map((url, idx) => (
              <div key={idx} className="relative group h-16 w-24 rounded-xl overflow-hidden border border-zinc-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`preview-${idx}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemovePhoto(idx)}
                  className="absolute inset-0 bg-black/60 text-white text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Amenities */}
      <div className="space-y-3">
        <label className={labelClass}>Amenities ({selectedAmenities.length} Selected)</label>
        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
          {commonAmenities.map((amenity) => {
            const isSelected = selectedAmenities.includes(amenity);
            return (
              <button
                type="button"
                key={amenity}
                onClick={() => toggleAmenity(amenity)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${isSelected
                    ? 'border-zinc-950 bg-zinc-950 text-white shadow-xs'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'
                  }`}
              >
                {isSelected ? '✓ ' : '+ '}
                {amenity}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pt-1 max-w-md">
          <input
            type="text"
            placeholder="Add custom amenity..."
            value={customAmenityText}
            onChange={(e) => setCustomAmenityText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddCustomAmenity();
              }
            }}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 px-3.5 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:border-zinc-950 outline-none"
          />
          <button
            type="button"
            onClick={onAddCustomAmenity}
            disabled={!customAmenityText.trim()}
            className="rounded-xl border border-zinc-200 bg-zinc-100 hover:bg-zinc-200 px-4 py-2 text-xs font-bold text-zinc-800 transition-colors whitespace-nowrap cursor-pointer"
          >
            Add
          </button>
        </div>
      </div>

      {/* Add-ons Builder */}
      <RoomAddonsManager
        initialData={addons}
        onChange={setAddons}
      />
    </div>
  );
}

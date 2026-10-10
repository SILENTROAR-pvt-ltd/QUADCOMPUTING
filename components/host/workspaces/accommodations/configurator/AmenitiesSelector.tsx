'use client';

import React, { useState } from 'react';
import { Plus, Check } from 'lucide-react';

interface Props {
  allAmenitiesList: string[];
  setAllAmenitiesList: React.Dispatch<React.SetStateAction<string[]>>;
  selectedAmenities: string[];
  setSelectedAmenities: React.Dispatch<React.SetStateAction<string[]>>;
}

const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500';

export function AmenitiesSelector({
  allAmenitiesList,
  setAllAmenitiesList,
  selectedAmenities,
  setSelectedAmenities
}: Props) {
  const [customAmenityText, setCustomAmenityText] = useState('');

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const handleAddCustomAmenity = () => {
    const trimmed = customAmenityText.trim();
    if (!trimmed) return;
    if (!allAmenitiesList.includes(trimmed)) {
      setAllAmenitiesList(prev => [...prev, trimmed]);
    }
    if (!selectedAmenities.includes(trimmed)) {
      setSelectedAmenities(prev => [...prev, trimmed]);
    }
    setCustomAmenityText('');
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <label className={labelClass}>
          Select Room Amenities & Inclusions ({selectedAmenities.length} Selected)
        </label>
        <span className="text-[11px] text-neutral-400">Click to toggle or add custom below</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {allAmenitiesList.map((amenity) => {
          const isSelected = selectedAmenities.includes(amenity);
          return (
            <button
              type="button"
              key={amenity}
              onClick={() => toggleAmenity(amenity)}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all duration-150 cursor-pointer select-none ${
                isSelected
                  ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                  : 'border-neutral-200/90 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 shadow-2xs'
              }`}
            >
              {isSelected ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-white" />
              ) : (
                <Plus className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
              )}
              <span>{amenity}</span>
            </button>
          );
        })}
      </div>

      {/* Add Custom Amenity Input Row */}
      <div className="flex items-center gap-2 pt-1 max-w-md">
        <input
          type="text"
          placeholder="Add custom amenity (e.g. Fireplace, Steam Room)..."
          value={customAmenityText}
          onChange={(e) => setCustomAmenityText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddCustomAmenity();
            }
          }}
          className="w-full rounded-xl border border-neutral-200/90 bg-white px-3.5 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 outline-none shadow-2xs focus:ring-2 focus:ring-neutral-900/10"
        />
        <button
          type="button"
          onClick={handleAddCustomAmenity}
          disabled={!customAmenityText.trim()}
          className="rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-40 px-4 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900 transition-all whitespace-nowrap flex items-center gap-1.5 shadow-2xs cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 text-neutral-500" />
          <span>Add Amenity</span>
        </button>
      </div>
    </div>
  );
}

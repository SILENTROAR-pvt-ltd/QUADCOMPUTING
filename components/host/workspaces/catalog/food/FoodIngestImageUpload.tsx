'use client';

import React, { useRef } from 'react';
import { Upload, X } from 'lucide-react';

interface FoodIngestImageUploadProps {
  foodImageUrl: string;
  setFoodImageUrl: (url: string) => void;
  inputClass: string;
  labelClass: string;
}

export function FoodIngestImageUpload({
  foodImageUrl,
  setFoodImageUrl,
  inputClass,
  labelClass,
}: FoodIngestImageUploadProps) {
  const foodFileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileSelect = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setFoodImageUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="sm:col-span-2">
      <label className={labelClass}>Cover Image</label>
      <div className="flex gap-2">
        <input
          type="url"
          value={foodImageUrl}
          onChange={(e) => setFoodImageUrl(e.target.value)}
          className={`${inputClass} flex-1`}
          placeholder="https://images.unsplash.com/... or paste image URL"
        />
        <input
          type="file"
          ref={foodFileInputRef}
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleImageFileSelect(e.target.files[0])}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => foodFileInputRef.current?.click()}
          className="rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 active:bg-neutral-100 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 shadow-2xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Upload className="h-4 w-4 text-neutral-500" />
          <span>Upload</span>
        </button>
      </div>
      {foodImageUrl && (
        <div className="mt-3 h-28 w-44 overflow-hidden rounded-xl border border-neutral-200 shadow-xs relative group bg-neutral-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foodImageUrl} alt="Food Preview" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => setFoodImageUrl('')}
            className="absolute top-1.5 right-1.5 rounded-full bg-white/90 hover:bg-white text-neutral-700 hover:text-neutral-900 p-1.5 shadow-sm backdrop-blur-xs transition-all cursor-pointer"
            aria-label="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

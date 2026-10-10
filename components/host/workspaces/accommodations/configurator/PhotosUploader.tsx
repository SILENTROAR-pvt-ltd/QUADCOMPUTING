'use client';

import React, { useRef } from 'react';
import { Plus, X, Upload } from 'lucide-react';

interface Props {
  photoUrl: string;
  setPhotoUrl: (val: string) => void;
  photoList: string[];
  setPhotoList: React.Dispatch<React.SetStateAction<string[]>>;
}

const inputClass =
  'w-full rounded-xl border border-neutral-200/90 bg-white hover:border-neutral-300 focus:border-neutral-900 px-4 py-2.5 sm:py-3 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-2xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-neutral-900/10';
const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500';

export function PhotosUploader({
  photoUrl,
  setPhotoUrl,
  photoList,
  setPhotoList
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddPhoto = () => {
    if (!photoUrl.trim()) return;
    setPhotoList(prev => [...prev, photoUrl.trim()]);
    setPhotoUrl('');
  };

  const handleFileSelect = (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoList(prev => [...prev, reader.result as string]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoList(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className={labelClass}>Accommodation Photos (URLs or Upload)</label>
        <span className="text-[11px] text-neutral-400">{photoList.length} photo{photoList.length === 1 ? '' : 's'} added</span>
      </div>
      <div className="flex gap-2">
        <input
          type="url"
          placeholder="https://images.unsplash.com/... or paste image URL"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddPhoto();
            }
          }}
          className={`${inputClass} flex-1`}
        />
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          className="hidden"
        />
        <button
          type="button"
          onClick={handleAddPhoto}
          disabled={!photoUrl.trim()}
          className="rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-40 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 shadow-2xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4 text-neutral-500" />
          <span>Add URL</span>
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 active:bg-neutral-100 px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 shadow-2xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Upload className="h-4 w-4 text-neutral-500" />
          <span>Upload</span>
        </button>
      </div>

      {/* Previews */}
      {photoList.length > 0 && (
        <div className="flex flex-wrap gap-2.5 pt-1">
          {photoList.map((url, idx) => (
            <div key={idx} className="relative group h-20 w-28 rounded-xl overflow-hidden border border-neutral-200 shadow-2xs bg-neutral-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`preview-${idx}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemovePhoto(idx)}
                className="absolute top-1.5 right-1.5 rounded-full bg-white/95 hover:bg-white text-neutral-700 hover:text-neutral-900 p-1.5 shadow-sm backdrop-blur-xs transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                aria-label="Remove photo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

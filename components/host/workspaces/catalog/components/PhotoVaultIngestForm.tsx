'use client';

import React, { useState, useRef } from 'react';
import { Sparkles, Upload, Image as ImageIcon, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PhotoVaultIngestFormProps {
  venueId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

const CATEGORY_PRESETS = [
  'Acoustic Lounge',
  'Cocktail Specials',
  'Sunset Terrace',
  'Omakase Dining',
  'Audiophile Night',
  'Roastery Lab',
  'Live Music & DJ',
  'Chef Specials',
];

const TIME_TAG_PRESETS = [
  'Tonight @ 8:30 PM',
  'Daily @ 7:00 PM',
  'Every Evening @ 6:15 PM',
  'Thur - Sat @ 9:00 PM',
  'Sundays @ 5:00 PM',
  'Daily Specials',
];

const SAMPLE_PRESET_IMAGES = [
  {
    label: 'Acoustic',
    url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Cocktails',
    url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Sunset',
    url: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80',
  },
  {
    label: 'Dining',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
  },
];

export function PhotoVaultIngestForm({ venueId, onSuccess, onCancel }: PhotoVaultIngestFormProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORY_PRESETS[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [timeTag, setTimeTag] = useState(TIME_TAG_PRESETS[0]);
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const finalCategory = category === 'custom' ? customCategory.trim() : category;

  // Handle local file upload with Supabase Storage integration
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setToast(null);

    try {
      const supabase = createClient();
      if (supabase) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${venueId}/${Date.now()}-${Math.random().toString(36).substring(2, 6)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('venue-vault')
          .upload(fileName, file, { upsert: true });

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from('venue-vault')
            .getPublicUrl(fileName);

          if (publicUrlData?.publicUrl) {
            setImageUrl(publicUrlData.publicUrl);
            setToast({ type: 'success', message: 'Image uploaded to Supabase Storage!' });
            setIsUploading(false);
            return;
          }
        }
      }
    } catch (uploadErr) {
      console.warn('[PhotoVaultIngestForm] Storage upload note, falling back to local reader:', uploadErr);
    }

    // Fallback: Read as Data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageUrl(event.target.result as string);
        setToast({ type: 'success', message: 'Photo loaded and ready for ingestion.' });
      }
      setIsUploading(false);
    };
    reader.onerror = () => {
      setToast({ type: 'error', message: 'Failed to read image file.' });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setToast({ type: 'error', message: 'Please provide a title for the event moment.' });
      return;
    }
    if (!imageUrl.trim()) {
      setToast({ type: 'error', message: 'Please provide an image URL or upload a photo.' });
      return;
    }
    if (category === 'custom' && !customCategory.trim()) {
      setToast({ type: 'error', message: 'Please specify the custom category name.' });
      return;
    }

    setIsSubmitting(true);
    setToast(null);

    const payload = {
      venue_id: venueId,
      title: title.trim(),
      category: finalCategory || 'Acoustic Lounge',
      time_tag: timeTag.trim(),
      timeTag: timeTag.trim(),
      image_url: imageUrl.trim(),
      imageUrl: imageUrl.trim(),
      description: description.trim(),
    };

    // One write, through the API: it is the only writer, and it is scoped to this venue.
    try {
      const res = await fetch('/api/venue/photo-vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setToast({
          type: 'success',
          message: 'Moment successfully published! Visible instantly on the Guest Social Lobby.',
        });
        // Reset form
        setTitle('');
        setDescription('');
        setImageUrl('');
        setCustomCategory('');
        setIsSubmitting(false);
        setTimeout(() => {
          onSuccess();
        }, 800);
        return;
      }

      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to insert venue photo moment');
    } catch (apiErr: any) {
      console.error('[PhotoVaultIngestForm Submit Error]', apiErr);
      setToast({
        type: 'error',
        message: apiErr.message || 'Error publishing event moment. Please try again.',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`flex items-center gap-2.5 p-3.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-neutral-900 text-white border border-neutral-800 shadow-xs'
              : 'bg-rose-50 text-rose-800 border border-rose-200 shadow-xs'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Grid: Title & Category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs sm:text-[13px] font-semibold text-neutral-800 mb-1.5">
            Event / Photo Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Sunset Acoustics & Cocktails"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 shadow-2xs transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-[13px] font-semibold text-neutral-800 mb-1.5">
            Category <span className="text-rose-500">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 shadow-2xs cursor-pointer transition-colors"
          >
            {CATEGORY_PRESETS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="custom">+ Custom Category</option>
          </select>
        </div>
      </div>

      {category === 'custom' && (
        <div>
          <label className="block text-xs sm:text-[13px] font-semibold text-neutral-800 mb-1.5">
            Custom Category Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Moonlit Bonfire"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 shadow-2xs transition-colors"
          />
        </div>
      )}

      {/* Time Tag with Quick Selector Chips */}
      <div>
        <label className="block text-xs sm:text-[13px] font-semibold text-neutral-800 mb-1.5">
          Time Tag <span className="text-neutral-400 font-normal">(e.g. Tonight @ 8:30 PM)</span>
        </label>
        <input
          type="text"
          placeholder="Tonight @ 8:30 PM"
          value={timeTag}
          onChange={(e) => setTimeTag(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 shadow-2xs mb-2 transition-colors"
        />
        <div className="flex flex-wrap gap-2">
          {TIME_TAG_PRESETS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTimeTag(tag)}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                timeTag === tag
                  ? 'bg-neutral-900 text-white font-semibold shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Image URL & File Uploader */}
      <div>
        <label className="block text-xs sm:text-[13px] font-semibold text-neutral-800 mb-1.5">
          Image URL or Upload <span className="text-rose-500">*</span>
        </label>
        <div className="flex gap-2.5">
          <input
            type="url"
            placeholder="https://images.unsplash.com/..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 shadow-2xs transition-colors"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs sm:text-sm font-semibold text-neutral-700 transition-all cursor-pointer shadow-2xs"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-neutral-600" />
            ) : (
              <Upload className="w-4 h-4 text-neutral-600" />
            )}
            <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Quick Sample Presets */}
        <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-1">
          <span className="text-xs text-neutral-400 font-mono">Sample Presets:</span>
          {SAMPLE_PRESET_IMAGES.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setImageUrl(preset.url)}
              className="px-2.5 py-1 rounded-lg text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700 cursor-pointer font-medium transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Live Preview Box */}
        {imageUrl && (
          <div className="mt-3.5 relative rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100 max-h-56 flex items-center justify-center shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Preview"
              className="w-full h-52 object-cover"
              onError={() => setToast({ type: 'error', message: 'Unable to render image from provided URL.' })}
            />
            <div className="absolute top-3 right-3">
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="px-2.5 py-1 rounded-lg bg-black/70 text-white text-xs font-medium backdrop-blur-md hover:bg-black/90 cursor-pointer"
              >
                Clear Photo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs sm:text-[13px] font-semibold text-neutral-800 mb-1.5">
          Editorial Description
        </label>
        <textarea
          rows={3}
          placeholder="Intimate unplugged guitar rhythms and ambient vocal harmonies under candlelit arches..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 shadow-2xs resize-none transition-colors"
        />
      </div>

      {/* Action Footer - Absolutely Zero Gold/Amber */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Sparkles className="w-4 h-4 text-white" />
          )}
          <span>{isSubmitting ? 'Publishing Moment...' : 'Publish to Guest Social Lobby'}</span>
        </button>
      </div>
    </form>
  );
}

export default PhotoVaultIngestForm;
